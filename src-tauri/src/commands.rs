use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use sqlx::Row;
use sqlx::FromRow;
use tauri::Manager;

use sqlx::sqlite::SqliteConnectOptions;
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ProjectInfo {
    pub id: i64,
    pub name: String,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewProject {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectUpdate {
    pub id: i64,
    pub name: Option<String>,
    pub thumbnail: Option<String>,
}

fn db_path_str(path: &PathBuf) -> String {
    format!("sqlite:{}", path.to_string_lossy())
}

async fn ensure_tables(pool: &sqlx::SqlitePool) -> Result<(), String> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            modified_at TEXT DEFAULT (datetime('now')),
            thumbnail TEXT
        )"
    ).execute(pool).await.map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS palettes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            palette_id TEXT NOT NULL,
            name TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0,
            is_default INTEGER NOT NULL DEFAULT 0,
            colors TEXT NOT NULL DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )"
    ).execute(pool).await.map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS pinned_colors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            color_id TEXT NOT NULL,
            hex TEXT NOT NULL,
            r_value REAL NOT NULL,
            g_value REAL NOT NULL,
            b_value REAL NOT NULL,
            notes TEXT DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )"
    ).execute(pool).await.map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS calibrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            calibration_data TEXT NOT NULL,
            scale TEXT, unit TEXT,
            image_width INTEGER, image_height INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            modified_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )"
    ).execute(pool).await.map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS canvas_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL UNIQUE,
            settings_data TEXT NOT NULL DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now')),
            modified_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )"
    ).execute(pool).await.map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )"
    ).execute(pool).await.map_err(|e| e.to_string())?;

    Ok(())
}

async fn get_pool(app: &tauri::AppHandle) -> Result<sqlx::SqlitePool, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    let db_file = path.join("colorwizard.db");

    // Use SqliteConnectOptions which handles special chars in paths properly
    let db_str = db_file.to_string_lossy();
    let options = SqliteConnectOptions::from_str(&format!("sqlite:{}?mode=rwc", db_str))
        .map_err(|e| e.to_string())?
        .create_if_missing(true);

    let pool = sqlx::SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    ensure_tables(&pool).await?;
    Ok(pool)
}

#[tauri::command]
pub async fn cw_init_database(app: tauri::AppHandle) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("colorwizard.db");
    pool.close().await;
    Ok(format!("OK: {}", path.to_string_lossy()))
}

#[tauri::command]
pub async fn cw_create_project(app: tauri::AppHandle, project: NewProject) -> Result<ProjectInfo, String> {
    let pool = get_pool(&app).await?;
    let result = sqlx::query_as::<_, ProjectInfo>(
        "INSERT INTO projects (name) VALUES (?) RETURNING id, name, created_at, modified_at, thumbnail"
    )
    .bind(&project.name)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    pool.close().await;
    Ok(result)
}

#[tauri::command]
pub async fn cw_list_projects(app: tauri::AppHandle) -> Result<Vec<ProjectInfo>, String> {
    let pool = get_pool(&app).await?;
    let projects = sqlx::query_as::<_, ProjectInfo>(
        "SELECT id, name, created_at, modified_at, thumbnail FROM projects ORDER BY modified_at DESC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;
    pool.close().await;
    Ok(projects)
}

#[tauri::command]
pub async fn cw_get_project(app: tauri::AppHandle, project_id: i64) -> Result<ProjectInfo, String> {
    let pool = get_pool(&app).await?;
    let project = sqlx::query_as::<_, ProjectInfo>(
        "SELECT id, name, created_at, modified_at, thumbnail FROM projects WHERE id = ?"
    )
    .bind(project_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| format!("not found: {}", project_id))?;
    pool.close().await;
    Ok(project)
}

#[tauri::command]
pub async fn cw_update_project(app: tauri::AppHandle, update: ProjectUpdate) -> Result<ProjectInfo, String> {
    let pool = get_pool(&app).await?;
    if let Some(name) = &update.name {
        sqlx::query("UPDATE projects SET name = ?, modified_at = datetime('now') WHERE id = ?")
            .bind(name).bind(update.id)
            .execute(&pool).await.map_err(|e| e.to_string())?;
    }
    if let Some(thumbnail) = &update.thumbnail {
        sqlx::query("UPDATE projects SET thumbnail = ?, modified_at = datetime('now') WHERE id = ?")
            .bind(thumbnail).bind(update.id)
            .execute(&pool).await.map_err(|e| e.to_string())?;
    }
    sqlx::query("UPDATE projects SET modified_at = datetime('now') WHERE id = ?")
        .bind(update.id)
        .execute(&pool).await.map_err(|e| e.to_string())?;

    let project = sqlx::query_as::<_, ProjectInfo>(
        "SELECT id, name, created_at, modified_at, thumbnail FROM projects WHERE id = ?"
    ).bind(update.id).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    pool.close().await;
    Ok(project)
}

#[tauri::command]
pub async fn cw_delete_project(app: tauri::AppHandle, project_id: i64) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(project_id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    pool.close().await;
    Ok("deleted".to_string())
}

#[tauri::command]
pub async fn cw_save_palettes(app: tauri::AppHandle, project_id: i64, palettes_json: String) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM palettes WHERE project_id = ?")
        .bind(project_id).execute(&pool).await.map_err(|e| e.to_string())?;

    let palettes: Vec<serde_json::Value> = serde_json::from_str(&palettes_json).map_err(|e| e.to_string())?;
    for palette in &palettes {
        let id = palette.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let name = palette.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let is_active = palette.get("isActive").and_then(|v| v.as_bool()).unwrap_or(false) as i64;
        let is_default = palette.get("isDefault").and_then(|v| v.as_bool()).unwrap_or(false) as i64;
        let colors = palette.get("colors").map(|v| v.to_string()).unwrap_or("[]".to_string());
        sqlx::query(
            "INSERT INTO palettes (project_id, palette_id, name, is_active, is_default, colors) VALUES (?,?,?,?,?,?)"
        ).bind(project_id).bind(id).bind(name).bind(is_active).bind(is_default).bind(&colors)
         .execute(&pool).await.map_err(|e| e.to_string())?;
    }
    sqlx::query("UPDATE projects SET modified_at = datetime('now') WHERE id = ?").bind(project_id)
        .execute(&pool).await.ok();
    pool.close().await;
    Ok(format!("saved {}", palettes.len()))
}

#[tauri::command]
pub async fn cw_load_palettes(app: tauri::AppHandle, project_id: i64) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query(
        "SELECT palette_id, name, is_active, is_default, colors FROM palettes WHERE project_id = ?"
    ).bind(project_id).fetch_all(&pool).await.map_err(|e| e.to_string())?;
    let result: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.get::<String, _>("palette_id"),
        "name": r.get::<String, _>("name"),
        "isActive": r.get::<i64, _>("is_active") == 1,
        "isDefault": r.get::<i64, _>("is_default") == 1,
        "colors": serde_json::from_str::<serde_json::Value>(&r.get::<String, _>("colors")).unwrap_or(serde_json::json!([]))
    })).collect();
    pool.close().await;
    Ok(serde_json::to_string(&result).unwrap_or("[]".into()))
}

#[tauri::command]
pub async fn cw_save_pinned_colors(app: tauri::AppHandle, project_id: i64, pinned_colors_json: String) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM pinned_colors WHERE project_id = ?").bind(project_id).execute(&pool).await.map_err(|e| e.to_string())?;
    let colors: Vec<serde_json::Value> = serde_json::from_str(&pinned_colors_json).map_err(|e| e.to_string())?;
    for (idx, color) in colors.iter().enumerate() {
        let id = color.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let hex = color.get("hex").and_then(|v| v.as_str()).unwrap_or("#000000");
        let r = color.get("rgb").and_then(|v| v.get("r")).and_then(|v| v.as_f64()).unwrap_or(0.0);
        let g = color.get("rgb").and_then(|v| v.get("g")).and_then(|v| v.as_f64()).unwrap_or(0.0);
        let b = color.get("rgb").and_then(|v| v.get("b")).and_then(|v| v.as_f64()).unwrap_or(0.0);
        let notes = color.get("notes").and_then(|v| v.as_str()).unwrap_or("");
        sqlx::query(
            "INSERT INTO pinned_colors (project_id, color_id, hex, r_value, g_value, b_value, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)"
        ).bind(project_id).bind(id).bind(hex).bind(r).bind(g).bind(b).bind(notes).bind(idx as i64)
         .execute(&pool).await.map_err(|e| e.to_string())?;
    }
    pool.close().await;
    Ok(format!("saved {}", colors.len()))
}

#[tauri::command]
pub async fn cw_load_pinned_colors(app: tauri::AppHandle, project_id: i64) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query("SELECT color_id, hex, r_value, g_value, b_value, notes FROM pinned_colors WHERE project_id = ? ORDER BY sort_order")
        .bind(project_id).fetch_all(&pool).await.map_err(|e| e.to_string())?;
    let result: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.get::<String, _>("color_id"),
        "hex": r.get::<String, _>("hex"),
        "rgb": {"r": r.get::<f64, _>("r_value"), "g": r.get::<f64, _>("g_value"), "b": r.get::<f64, _>("b_value")},
        "notes": r.get::<String, _>("notes")
    })).collect();
    pool.close().await;
    Ok(serde_json::to_string(&result).unwrap_or("[]".into()))
}

#[tauri::command]
pub async fn cw_set_app_setting(app: tauri::AppHandle, key: String, value: String) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    sqlx::query("INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&key).bind(&value).execute(&pool).await.map_err(|e| e.to_string())?;
    pool.close().await;
    Ok("ok".to_string())
}

#[tauri::command]
pub async fn cw_get_app_setting(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let pool = get_pool(&app).await?;
    let row = sqlx::query("SELECT value FROM app_settings WHERE key = ?")
        .bind(&key).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    let result = row.map(|r| r.get::<String, _>("value"));
    pool.close().await;
    Ok(result)
}

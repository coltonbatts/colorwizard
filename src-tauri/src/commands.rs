use base64::Engine;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::Row;
use std::path::PathBuf;
use tauri::Manager;

use sqlx::sqlite::SqliteConnectOptions;

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

const PROJECT_LIST_SQL: &str = "
    SELECT
        p.id,
        p.name,
        p.created_at,
        p.modified_at,
        COALESCE(NULLIF(p.thumbnail, ''), json_extract(a.value, '$.referenceImage')) AS thumbnail
    FROM projects p
    LEFT JOIN app_settings a ON a.key = ('project:' || p.id || ':canvas')
    ORDER BY p.modified_at DESC
";
const PROJECT_BY_ID_SQL: &str = "
    SELECT
        p.id,
        p.name,
        p.created_at,
        p.modified_at,
        COALESCE(NULLIF(p.thumbnail, ''), json_extract(a.value, '$.referenceImage')) AS thumbnail
    FROM projects p
    LEFT JOIN app_settings a ON a.key = ('project:' || p.id || ':canvas')
    WHERE p.id = ?
";

fn app_db_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| {
        format!(
            "failed to create app data directory {}: {}",
            app_data_dir.display(),
            e
        )
    })?;

    Ok(app_data_dir.join("colorwizard.db"))
}

async fn ensure_tables(pool: &sqlx::SqlitePool) -> Result<(), String> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            modified_at TEXT DEFAULT (datetime('now')),
            thumbnail TEXT
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

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
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

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
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

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
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS canvas_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL UNIQUE,
            settings_data TEXT NOT NULL DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now')),
            modified_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

async fn get_pool(app: &tauri::AppHandle) -> Result<sqlx::SqlitePool, String> {
    let db_file = app_db_file(app)?;
    let options = SqliteConnectOptions::new()
        .filename(&db_file)
        .create_if_missing(true);

    let pool = sqlx::SqlitePool::connect_with(options).await.map_err(|e| {
        format!(
            "failed to open SQLite database at {}: {}",
            db_file.display(),
            e
        )
    })?;

    ensure_tables(&pool).await?;
    Ok(pool)
}

#[allow(non_snake_case)]
fn resolve_project_id(project_id: Option<i64>, projectId: Option<i64>) -> Result<i64, String> {
    project_id
        .or(projectId)
        .ok_or_else(|| "missing required key projectId".to_string())
}

fn resolve_string_arg(
    primary: Option<String>,
    alias: Option<String>,
    arg_name: &str,
) -> Result<String, String> {
    primary
        .or(alias)
        .ok_or_else(|| format!("missing required key {}", arg_name))
}

fn image_mime_type(path: &str) -> &'static str {
    match path
        .rsplit('.')
        .next()
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("avif") => "image/avif",
        Some("heic") => "image/heic",
        Some("heif") => "image/heif",
        Some("tif") | Some("tiff") => "image/tiff",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub async fn cw_init_database(app: tauri::AppHandle) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    let path = app_db_file(&app)?;
    pool.close().await;
    Ok(format!("OK: {}", path.to_string_lossy()))
}

#[tauri::command]
pub async fn cw_read_file_as_data_url(path: String) -> Result<String, String> {
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|e| format!("failed to read image {}: {}", path, e))?;
    let mime = image_mime_type(&path);
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

#[tauri::command]
pub async fn cw_create_project(
    app: tauri::AppHandle,
    project: NewProject,
) -> Result<ProjectInfo, String> {
    let pool = get_pool(&app).await?;
    let inserted_id = sqlx::query("INSERT INTO projects (name) VALUES (?)")
        .bind(&project.name)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    let result = sqlx::query_as::<_, ProjectInfo>(PROJECT_BY_ID_SQL)
        .bind(inserted_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    pool.close().await;
    Ok(result)
}

#[tauri::command]
pub async fn cw_list_projects(app: tauri::AppHandle) -> Result<Vec<ProjectInfo>, String> {
    let pool = get_pool(&app).await?;
    let projects = sqlx::query_as::<_, ProjectInfo>(PROJECT_LIST_SQL)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;
    pool.close().await;
    Ok(projects)
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_get_project(
    app: tauri::AppHandle,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<ProjectInfo, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pool = get_pool(&app).await?;
    let project = sqlx::query_as::<_, ProjectInfo>(PROJECT_BY_ID_SQL)
        .bind(project_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("not found: {}", project_id))?;
    pool.close().await;
    Ok(project)
}

#[tauri::command]
pub async fn cw_update_project(
    app: tauri::AppHandle,
    update: ProjectUpdate,
) -> Result<ProjectInfo, String> {
    let pool = get_pool(&app).await?;
    if let Some(name) = &update.name {
        sqlx::query("UPDATE projects SET name = ?, modified_at = datetime('now') WHERE id = ?")
            .bind(name)
            .bind(update.id)
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(thumbnail) = &update.thumbnail {
        if thumbnail.is_empty() {
            sqlx::query(
                "UPDATE projects SET thumbnail = NULL, modified_at = datetime('now') WHERE id = ?",
            )
            .bind(update.id)
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            sqlx::query(
                "UPDATE projects SET thumbnail = ?, modified_at = datetime('now') WHERE id = ?",
            )
            .bind(thumbnail)
            .bind(update.id)
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;
        }
    }
    sqlx::query("UPDATE projects SET modified_at = datetime('now') WHERE id = ?")
        .bind(update.id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let project = sqlx::query_as::<_, ProjectInfo>(PROJECT_BY_ID_SQL)
        .bind(update.id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;
    pool.close().await;
    Ok(project)
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_delete_project(
    app: tauri::AppHandle,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
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
#[allow(non_snake_case)]
pub async fn cw_save_palettes(
    app: tauri::AppHandle,
    project_id: Option<i64>,
    projectId: Option<i64>,
    palettes_json: Option<String>,
    palettesJson: Option<String>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let palettes_json = resolve_string_arg(palettes_json, palettesJson, "palettesJson")?;
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM palettes WHERE project_id = ?")
        .bind(project_id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let palettes: Vec<serde_json::Value> =
        serde_json::from_str(&palettes_json).map_err(|e| e.to_string())?;
    for palette in &palettes {
        let id = palette.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let name = palette.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let is_active = palette
            .get("isActive")
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as i64;
        let is_default = palette
            .get("isDefault")
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as i64;
        let colors = palette
            .get("colors")
            .map(|v| v.to_string())
            .unwrap_or("[]".to_string());
        sqlx::query(
            "INSERT INTO palettes (project_id, palette_id, name, is_active, is_default, colors) VALUES (?,?,?,?,?,?)"
        ).bind(project_id).bind(id).bind(name).bind(is_active).bind(is_default).bind(&colors)
         .execute(&pool).await.map_err(|e| e.to_string())?;
    }
    sqlx::query("UPDATE projects SET modified_at = datetime('now') WHERE id = ?")
        .bind(project_id)
        .execute(&pool)
        .await
        .ok();
    pool.close().await;
    Ok(format!("saved {}", palettes.len()))
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_load_palettes(
    app: tauri::AppHandle,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pool = get_pool(&app).await?;
    let rows = sqlx::query(
        "SELECT palette_id, name, is_active, is_default, colors FROM palettes WHERE project_id = ?",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;
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
#[allow(non_snake_case)]
pub async fn cw_save_pinned_colors(
    app: tauri::AppHandle,
    project_id: Option<i64>,
    projectId: Option<i64>,
    pinned_colors_json: Option<String>,
    pinnedColorsJson: Option<String>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pinned_colors_json =
        resolve_string_arg(pinned_colors_json, pinnedColorsJson, "pinnedColorsJson")?;
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM pinned_colors WHERE project_id = ?")
        .bind(project_id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    let colors: Vec<serde_json::Value> =
        serde_json::from_str(&pinned_colors_json).map_err(|e| e.to_string())?;
    for (idx, color) in colors.iter().enumerate() {
        let id = color.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let hex = color
            .get("hex")
            .and_then(|v| v.as_str())
            .unwrap_or("#000000");
        let r = color
            .get("rgb")
            .and_then(|v| v.get("r"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let g = color
            .get("rgb")
            .and_then(|v| v.get("g"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let b = color
            .get("rgb")
            .and_then(|v| v.get("b"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
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
#[allow(non_snake_case)]
pub async fn cw_load_pinned_colors(
    app: tauri::AppHandle,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
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
pub async fn cw_set_app_setting(
    app: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<String, String> {
    let pool = get_pool(&app).await?;
    sqlx::query("INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&key).bind(&value).execute(&pool).await.map_err(|e| e.to_string())?;
    pool.close().await;
    Ok("ok".to_string())
}

#[tauri::command]
pub async fn cw_get_app_setting(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let pool = get_pool(&app).await?;
    let row = sqlx::query("SELECT value FROM app_settings WHERE key = ?")
        .bind(&key)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;
    let result = row.map(|r| r.get::<String, _>("value"));
    pool.close().await;
    Ok(result)
}

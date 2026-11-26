use base64::Engine;
use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions, SqliteSynchronous};
use sqlx::{FromRow, Row, SqlitePool};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::Manager;
use tokio::sync::OnceCell;

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

/// Shared SQLite pool initialized once per application lifecycle.
/// Using `OnceCell` keeps initialization fallible and retryable if the
/// database directory or file is temporarily unavailable at startup.
#[derive(Default)]
pub struct DbState {
    pool: OnceCell<SqlitePool>,
}

impl DbState {
    pub fn new() -> Self {
        Self {
            pool: OnceCell::new(),
        }
    }

    pub async fn get_pool(&self, app: &tauri::AppHandle) -> Result<&SqlitePool, String> {
        if let Some(pool) = self.pool.get() {
            return Ok(pool);
        }
        self.pool
            .get_or_try_init(|| async {
                let db_file = app_db_file(app)?;
                init_pool_at(&db_file).await
            })
            .await
    }

    #[cfg(test)]
    async fn get_or_init_at(&self, db_file: &Path) -> Result<&SqlitePool, String> {
        self.pool
            .get_or_try_init(|| init_pool_at(db_file))
            .await
    }
}

struct ParsedPalette {
    id: String,
    name: String,
    is_active: i64,
    is_default: i64,
    colors: String,
}

struct ParsedPinnedColor {
    id: String,
    hex: String,
    r: f64,
    g: f64,
    b: f64,
    notes: String,
    sort_order: i64,
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

fn app_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_data_dir.join("colorwizard.db"))
}

fn app_db_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let db_file = app_db_path(app)?;
    if let Some(app_data_dir) = db_file.parent() {
        std::fs::create_dir_all(app_data_dir).map_err(|e| {
            format!(
                "failed to create app data directory {}: {}",
                app_data_dir.display(),
                e
            )
        })?;
    }

    Ok(db_file)
}

async fn ensure_tables(pool: &SqlitePool) -> Result<(), String> {
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

/// Desktop durability: WAL reduces corruption risk on crash; busy_timeout avoids flaky writes under load.
/// Per-connection pragmas are also configured on `SqliteConnectOptions` so every pooled connection inherits them.
async fn apply_sqlite_pragmas(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    if let Err(e) = sqlx::query("PRAGMA journal_mode = WAL").execute(pool).await {
        eprintln!("[colorwizard] PRAGMA journal_mode=WAL failed (continuing): {e}");
    }
    sqlx::query("PRAGMA synchronous = NORMAL")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("PRAGMA busy_timeout = 5000")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn init_pool_at(db_file: &Path) -> Result<SqlitePool, String> {
    let options = SqliteConnectOptions::new()
        .filename(db_file)
        .create_if_missing(true)
        .foreign_keys(true)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_millis(5000));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| {
            format!(
                "failed to open SQLite database at {}: {}",
                db_file.display(),
                e
            )
        })?;

    apply_sqlite_pragmas(&pool).await?;
    ensure_tables(&pool).await?;
    Ok(pool)
}

fn parse_palettes_json(palettes_json: &str) -> Result<Vec<ParsedPalette>, String> {
    let raw: Vec<serde_json::Value> =
        serde_json::from_str(palettes_json).map_err(|e| format!("invalid palettes JSON: {e}"))?;
    let mut parsed = Vec::with_capacity(raw.len());
    for (idx, palette) in raw.iter().enumerate() {
        if !palette.is_object() {
            return Err(format!(
                "invalid palette at index {idx}: expected JSON object"
            ));
        }
        let id = palette
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let name = palette
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let is_active = i64::from(
            palette
                .get("isActive")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        );
        let is_default = i64::from(
            palette
                .get("isDefault")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
        );
        let colors = match palette.get("colors") {
            None | Some(serde_json::Value::Null) => "[]".to_string(),
            Some(v) if v.is_array() => v.to_string(),
            Some(_) => {
                return Err(format!(
                    "invalid palette at index {idx}: expected 'colors' to be a JSON array"
                ));
            }
        };
        parsed.push(ParsedPalette {
            id,
            name,
            is_active,
            is_default,
            colors,
        });
    }
    Ok(parsed)
}

fn parse_pinned_colors_json(pinned_colors_json: &str) -> Result<Vec<ParsedPinnedColor>, String> {
    let raw: Vec<serde_json::Value> = serde_json::from_str(pinned_colors_json)
        .map_err(|e| format!("invalid pinned colors JSON: {e}"))?;
    let mut parsed = Vec::with_capacity(raw.len());
    for (idx, color) in raw.iter().enumerate() {
        if !color.is_object() {
            return Err(format!(
                "invalid pinned color at index {idx}: expected JSON object"
            ));
        }
        let id = color
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let hex = color
            .get("hex")
            .and_then(|v| v.as_str())
            .unwrap_or("#000000")
            .to_string();
        let rgb = color.get("rgb");
        let r = rgb
            .and_then(|v| v.get("r"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let g = rgb
            .and_then(|v| v.get("g"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let b = rgb
            .and_then(|v| v.get("b"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let notes = color
            .get("notes")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        parsed.push(ParsedPinnedColor {
            id,
            hex,
            r,
            g,
            b,
            notes,
            sort_order: idx as i64,
        });
    }
    Ok(parsed)
}

async fn save_palettes_in_pool(
    pool: &SqlitePool,
    project_id: i64,
    palettes_json: &str,
) -> Result<String, String> {
    let palettes = parse_palettes_json(palettes_json)?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM palettes WHERE project_id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for palette in &palettes {
        sqlx::query(
            "INSERT INTO palettes (project_id, palette_id, name, is_active, is_default, colors) VALUES (?,?,?,?,?,?)",
        )
        .bind(project_id)
        .bind(&palette.id)
        .bind(&palette.name)
        .bind(palette.is_active)
        .bind(palette.is_default)
        .bind(&palette.colors)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query("UPDATE projects SET modified_at = datetime('now') WHERE id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("saved {}", palettes.len()))
}

async fn load_palettes_in_pool(pool: &SqlitePool, project_id: i64) -> Result<String, String> {
    let rows = sqlx::query(
        "SELECT palette_id, name, is_active, is_default, colors FROM palettes WHERE project_id = ?",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let result: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<String, _>("palette_id"),
                "name": r.get::<String, _>("name"),
                "isActive": r.get::<i64, _>("is_active") == 1,
                "isDefault": r.get::<i64, _>("is_default") == 1,
                "colors": serde_json::from_str::<serde_json::Value>(&r.get::<String, _>("colors"))
                    .unwrap_or_else(|_| serde_json::json!([]))
            })
        })
        .collect();

    Ok(serde_json::to_string(&result).unwrap_or_else(|_| "[]".into()))
}

async fn save_pinned_colors_in_pool(
    pool: &SqlitePool,
    project_id: i64,
    pinned_colors_json: &str,
) -> Result<String, String> {
    let colors = parse_pinned_colors_json(pinned_colors_json)?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM pinned_colors WHERE project_id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for color in &colors {
        sqlx::query(
            "INSERT INTO pinned_colors (project_id, color_id, hex, r_value, g_value, b_value, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(project_id)
        .bind(&color.id)
        .bind(&color.hex)
        .bind(color.r)
        .bind(color.g)
        .bind(color.b)
        .bind(&color.notes)
        .bind(color.sort_order)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query("UPDATE projects SET modified_at = datetime('now') WHERE id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("saved {}", colors.len()))
}

async fn load_pinned_colors_in_pool(pool: &SqlitePool, project_id: i64) -> Result<String, String> {
    let rows = sqlx::query(
        "SELECT color_id, hex, r_value, g_value, b_value, notes FROM pinned_colors WHERE project_id = ? ORDER BY sort_order",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let result: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<String, _>("color_id"),
                "hex": r.get::<String, _>("hex"),
                "rgb": {
                    "r": r.get::<f64, _>("r_value"),
                    "g": r.get::<f64, _>("g_value"),
                    "b": r.get::<f64, _>("b_value")
                },
                "notes": r.get::<String, _>("notes")
            })
        })
        .collect();

    Ok(serde_json::to_string(&result).unwrap_or_else(|_| "[]".into()))
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
        .ok_or_else(|| format!("missing required key {arg_name}"))
}

const MAX_IMAGE_FILE_BYTES: u64 = 50 * 1024 * 1024; // 50 MB
const ALLOWED_IMAGE_EXTENSIONS: &str =
    "jpg, jpeg, png, gif, webp, bmp, avif, heic, heif, tif, tiff";

fn image_mime_type_for_path(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?;
    match ext.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => Some("image/jpeg"),
        "png" => Some("image/png"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "bmp" => Some("image/bmp"),
        "avif" => Some("image/avif"),
        "heic" => Some("image/heic"),
        "heif" => Some("image/heif"),
        "tif" | "tiff" => Some("image/tiff"),
        _ => None,
    }
}

fn format_size_mb(bytes: u64) -> String {
    format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
}

async fn read_image_file_as_data_url(path: &Path, max_bytes: u64) -> Result<String, String> {
    use tokio::io::AsyncReadExt;

    if path.as_os_str().is_empty() {
        return Err("Cannot read image: file path is empty".to_string());
    }

    let path_mime = image_mime_type_for_path(path);

    let meta = match tokio::fs::metadata(path).await {
        Ok(meta) => meta,
        Err(err) => {
            if path_mime.is_none() {
                return Err(format!(
                    "Unsupported image file type for {}: only {ALLOWED_IMAGE_EXTENSIONS} are allowed",
                    path.display()
                ));
            }
            return Err(format!("Failed to inspect image {}: {err}", path.display()));
        }
    };

    if meta.is_dir() {
        return Err(format!(
            "Cannot read image {}: path is a directory",
            path.display()
        ));
    }

    if !meta.is_file() {
        return Err(format!(
            "Cannot read image {}: path is not a regular file",
            path.display()
        ));
    }

    if path_mime.is_none() {
        return Err(format!(
            "Unsupported image file type for {}: only {ALLOWED_IMAGE_EXTENSIONS} are allowed",
            path.display()
        ));
    }

    let canonical = tokio::fs::canonicalize(path)
        .await
        .map_err(|err| format!("Failed to resolve image path {}: {err}", path.display()))?;

    // Guard against symlinks with an image extension pointing at a non-image file.
    let canonical_mime = image_mime_type_for_path(&canonical).ok_or_else(|| {
        format!(
            "Unsupported image file type for resolved path {}: only {ALLOWED_IMAGE_EXTENSIONS} are allowed",
            canonical.display()
        )
    })?;

    let file = tokio::fs::File::open(&canonical)
        .await
        .map_err(|err| format!("Failed to open image {}: {err}", path.display()))?;

    // Inspect metadata on the open file handle before reading into memory.
    let file_meta = file
        .metadata()
        .await
        .map_err(|err| format!("Failed to inspect open image {}: {err}", path.display()))?;

    if file_meta.is_dir() {
        return Err(format!(
            "Cannot read image {}: path is a directory",
            path.display()
        ));
    }

    if !file_meta.is_file() {
        return Err(format!(
            "Cannot read image {}: path is not a regular file",
            path.display()
        ));
    }

    let file_len = file_meta.len();
    if file_len > max_bytes {
        return Err(format!(
            "Image file {} is too large ({} / {} bytes; maximum allowed is {} / {} bytes)",
            path.display(),
            format_size_mb(file_len),
            file_len,
            format_size_mb(max_bytes),
            max_bytes
        ));
    }

    let capacity = usize::try_from(file_len).unwrap_or(0);
    let mut bytes = Vec::with_capacity(capacity);
    let limit = max_bytes.saturating_add(1);
    file.take(limit)
        .read_to_end(&mut bytes)
        .await
        .map_err(|err| format!("Failed to read image {}: {err}", path.display()))?;

    if (bytes.len() as u64) > max_bytes {
        return Err(format!(
            "Image file {} exceeds the maximum allowed size ({} / {} bytes)",
            path.display(),
            format_size_mb(max_bytes),
            max_bytes
        ));
    }

    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{canonical_mime};base64,{encoded}"))
}

#[tauri::command]
pub async fn cw_init_database(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
) -> Result<String, String> {
    let _pool = db.get_pool(&app).await?;
    let path = app_db_path(&app)?;
    Ok(format!("OK: {}", path.to_string_lossy()))
}

#[tauri::command]
pub async fn cw_read_file_as_data_url(path: String) -> Result<String, String> {
    read_image_file_as_data_url(Path::new(&path), MAX_IMAGE_FILE_BYTES).await
}

#[tauri::command]
pub async fn cw_create_project(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    project: NewProject,
) -> Result<ProjectInfo, String> {
    let pool = db.get_pool(&app).await?;
    let inserted_id = sqlx::query("INSERT INTO projects (name) VALUES (?)")
        .bind(&project.name)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    sqlx::query_as::<_, ProjectInfo>(PROJECT_BY_ID_SQL)
        .bind(inserted_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cw_list_projects(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
) -> Result<Vec<ProjectInfo>, String> {
    let pool = db.get_pool(&app).await?;
    sqlx::query_as::<_, ProjectInfo>(PROJECT_LIST_SQL)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_get_project(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<ProjectInfo, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pool = db.get_pool(&app).await?;
    sqlx::query_as::<_, ProjectInfo>(PROJECT_BY_ID_SQL)
        .bind(project_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("not found: {project_id}"))
}

#[tauri::command]
pub async fn cw_update_project(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    update: ProjectUpdate,
) -> Result<ProjectInfo, String> {
    let pool = db.get_pool(&app).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    if let Some(name) = &update.name {
        sqlx::query("UPDATE projects SET name = ?, modified_at = datetime('now') WHERE id = ?")
            .bind(name)
            .bind(update.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(thumbnail) = &update.thumbnail {
        if thumbnail.is_empty() {
            sqlx::query(
                "UPDATE projects SET thumbnail = NULL, modified_at = datetime('now') WHERE id = ?",
            )
            .bind(update.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            sqlx::query(
                "UPDATE projects SET thumbnail = ?, modified_at = datetime('now') WHERE id = ?",
            )
            .bind(thumbnail)
            .bind(update.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
    }
    sqlx::query("UPDATE projects SET modified_at = datetime('now') WHERE id = ?")
        .bind(update.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ProjectInfo>(PROJECT_BY_ID_SQL)
        .bind(update.id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_delete_project(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pool = db.get_pool(&app).await?;
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(project_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok("deleted".to_string())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_save_palettes(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    project_id: Option<i64>,
    projectId: Option<i64>,
    palettes_json: Option<String>,
    palettesJson: Option<String>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let palettes_json = resolve_string_arg(palettes_json, palettesJson, "palettesJson")?;
    let pool = db.get_pool(&app).await?;
    save_palettes_in_pool(pool, project_id, &palettes_json).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_load_palettes(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pool = db.get_pool(&app).await?;
    load_palettes_in_pool(pool, project_id).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_save_pinned_colors(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    project_id: Option<i64>,
    projectId: Option<i64>,
    pinned_colors_json: Option<String>,
    pinnedColorsJson: Option<String>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pinned_colors_json =
        resolve_string_arg(pinned_colors_json, pinnedColorsJson, "pinnedColorsJson")?;
    let pool = db.get_pool(&app).await?;
    save_pinned_colors_in_pool(pool, project_id, &pinned_colors_json).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn cw_load_pinned_colors(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    project_id: Option<i64>,
    projectId: Option<i64>,
) -> Result<String, String> {
    let project_id = resolve_project_id(project_id, projectId)?;
    let pool = db.get_pool(&app).await?;
    load_pinned_colors_in_pool(pool, project_id).await
}

#[tauri::command]
pub async fn cw_set_app_setting(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    key: String,
    value: String,
) -> Result<String, String> {
    let pool = db.get_pool(&app).await?;
    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&value)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok("ok".to_string())
}

#[tauri::command]
pub async fn cw_get_app_setting(
    app: tauri::AppHandle,
    db: tauri::State<'_, DbState>,
    key: String,
) -> Result<Option<String>, String> {
    let pool = db.get_pool(&app).await?;
    let row = sqlx::query("SELECT value FROM app_settings WHERE key = ?")
        .bind(&key)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(row.map(|r| r.get::<String, _>("value")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;

    static NEXT_TEST_DB_ID: AtomicU64 = AtomicU64::new(1);

    struct TempDbPath {
        dir: PathBuf,
        db_file: PathBuf,
    }

    impl TempDbPath {
        fn new(label: &str) -> Self {
            let id = NEXT_TEST_DB_ID.fetch_add(1, Ordering::Relaxed);
            let dir = std::env::temp_dir().join(format!(
                "colorwizard_test_{}_{}_{}",
                std::process::id(),
                label,
                id
            ));
            std::fs::create_dir_all(&dir).expect("create temp test dir");
            let db_file = dir.join("colorwizard.db");
            Self { dir, db_file }
        }
    }

    impl Drop for TempDbPath {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.dir);
        }
    }

    async fn create_project(pool: &SqlitePool, name: &str) -> i64 {
        sqlx::query("INSERT INTO projects (name) VALUES (?)")
            .bind(name)
            .execute(pool)
            .await
            .expect("insert project")
            .last_insert_rowid()
    }

    #[tokio::test]
    async fn malformed_palettes_json_never_wipes_existing_palettes() {
        let tmp = TempDbPath::new("palettes");
        let db = DbState::new();
        let pool = db
            .get_or_init_at(&tmp.db_file)
            .await
            .expect("init shared pool");
        let project_id = create_project(pool, "Still Life").await;

        let initial_json = serde_json::json!([
            {
                "id": "pal-1",
                "name": "Core Six",
                "isActive": true,
                "isDefault": true,
                "colors": ["#FFFFFF", "#000000"]
            }
        ])
        .to_string();

        let saved = save_palettes_in_pool(pool, project_id, &initial_json)
            .await
            .expect("save initial palettes");
        assert_eq!(saved, "saved 1");

        // Malformed syntax, wrong top-level type, non-object element, and non-array colors must all fail cleanly.
        for bad_payload in [
            "{not valid json",
            r#"{"id":"not-an-array"}"#,
            "[123]",
            r#"[{"id":"pal-bad","name":"Bad","colors":"not-an-array"}]"#,
        ] {
            let err = save_palettes_in_pool(pool, project_id, bad_payload)
                .await
                .expect_err("bad palette payload should fail");
            assert!(!err.is_empty());

            let loaded = load_palettes_in_pool(pool, project_id)
                .await
                .expect("load palettes after failed save");
            let parsed: Vec<serde_json::Value> =
                serde_json::from_str(&loaded).expect("parse loaded palettes");
            assert_eq!(parsed.len(), 1);
            assert_eq!(parsed[0]["id"], "pal-1");
            assert_eq!(parsed[0]["name"], "Core Six");
            assert_eq!(parsed[0]["isActive"], true);
            assert_eq!(parsed[0]["colors"], serde_json::json!(["#FFFFFF", "#000000"]));
        }
    }

    #[tokio::test]
    async fn malformed_pinned_colors_json_never_wipes_existing_pinned_colors() {
        let tmp = TempDbPath::new("pinned");
        let db = DbState::new();
        let pool = db
            .get_or_init_at(&tmp.db_file)
            .await
            .expect("init shared pool");
        let project_id = create_project(pool, "Portrait").await;

        let initial_json = serde_json::json!([
            {
                "id": "pin-1",
                "hex": "#397DA8",
                "rgb": { "r": 57.0, "g": 125.0, "b": 168.0 },
                "notes": "Shadow glaze"
            },
            {
                "id": "pin-2",
                "hex": "#DAC49F",
                "rgb": { "r": 218.0, "g": 196.0, "b": 159.0 },
                "notes": "Cloud highlight"
            }
        ])
        .to_string();

        let saved = save_pinned_colors_in_pool(pool, project_id, &initial_json)
            .await
            .expect("save initial pinned colors");
        assert_eq!(saved, "saved 2");

        for bad_payload in ["[broken", r##"{"hex":"#000000"}"##, r#"["not-an-object"]"#] {
            let err = save_pinned_colors_in_pool(pool, project_id, bad_payload)
                .await
                .expect_err("bad pinned colors payload should fail");
            assert!(!err.is_empty());

            let loaded = load_pinned_colors_in_pool(pool, project_id)
                .await
                .expect("load pinned colors after failed save");
            let parsed: Vec<serde_json::Value> =
                serde_json::from_str(&loaded).expect("parse loaded pinned colors");
            assert_eq!(parsed.len(), 2);
            assert_eq!(parsed[0]["id"], "pin-1");
            assert_eq!(parsed[0]["hex"], "#397DA8");
            assert_eq!(parsed[1]["id"], "pin-2");
            assert_eq!(parsed[1]["notes"], "Cloud highlight");
        }
    }

    #[tokio::test]
    async fn save_palettes_rolls_back_on_foreign_key_violation() {
        let tmp = TempDbPath::new("fk_rollback");
        let db = DbState::new();
        let pool = db
            .get_or_init_at(&tmp.db_file)
            .await
            .expect("init shared pool");

        let payload = serde_json::json!([
            { "id": "orphan", "name": "Orphan", "isActive": true, "isDefault": false, "colors": [] }
        ])
        .to_string();

        let err = save_palettes_in_pool(pool, 999_999, &payload)
            .await
            .expect_err("foreign key violation should roll back");
        assert!(err.to_lowercase().contains("foreign key"));
    }

    #[tokio::test]
    async fn save_palettes_rolls_back_delete_on_mid_transaction_insert_failure() {
        let tmp = TempDbPath::new("palettes_tx_rollback");
        let db = DbState::new();
        let pool = db
            .get_or_init_at(&tmp.db_file)
            .await
            .expect("init shared pool");
        let project_id = create_project(pool, "Landscape").await;

        let initial_json = serde_json::json!([
            {
                "id": "orig-1",
                "name": "Original Palette",
                "isActive": true,
                "isDefault": true,
                "colors": ["#112233"]
            }
        ])
        .to_string();
        save_palettes_in_pool(pool, project_id, &initial_json)
            .await
            .expect("seed initial palette");

        // Force a SQLite failure on the second inserted row after DELETE has already run.
        sqlx::query(
            "CREATE TRIGGER fail_second_palette BEFORE INSERT ON palettes
             WHEN NEW.palette_id = 'boom'
             BEGIN
                 SELECT RAISE(ABORT, 'simulated mid-transaction palette failure');
             END",
        )
        .execute(pool)
        .await
        .expect("create palette failure trigger");

        let replacement_json = serde_json::json!([
            { "id": "new-1", "name": "New 1", "isActive": true, "isDefault": false, "colors": [] },
            { "id": "boom", "name": "New 2", "isActive": false, "isDefault": false, "colors": [] }
        ])
        .to_string();
        let err = save_palettes_in_pool(pool, project_id, &replacement_json)
            .await
            .expect_err("mid-transaction insert failure should roll back");
        assert!(err.contains("simulated mid-transaction palette failure"));

        let loaded = load_palettes_in_pool(pool, project_id)
            .await
            .expect("load palettes after rollback");
        let parsed: Vec<serde_json::Value> =
            serde_json::from_str(&loaded).expect("parse palettes");
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0]["id"], "orig-1");
        assert_eq!(parsed[0]["name"], "Original Palette");
    }

    #[tokio::test]
    async fn save_pinned_colors_rolls_back_delete_on_mid_transaction_insert_failure() {
        let tmp = TempDbPath::new("pinned_tx_rollback");
        let db = DbState::new();
        let pool = db
            .get_or_init_at(&tmp.db_file)
            .await
            .expect("init shared pool");
        let project_id = create_project(pool, "Still Life").await;

        let initial_json = serde_json::json!([
            {
                "id": "orig-pin",
                "hex": "#397DA8",
                "rgb": { "r": 57.0, "g": 125.0, "b": 168.0 },
                "notes": "Keep me"
            }
        ])
        .to_string();
        save_pinned_colors_in_pool(pool, project_id, &initial_json)
            .await
            .expect("seed initial pinned color");

        sqlx::query(
            "CREATE TRIGGER fail_second_pin BEFORE INSERT ON pinned_colors
             WHEN NEW.color_id = 'boom'
             BEGIN
                 SELECT RAISE(ABORT, 'simulated mid-transaction pin failure');
             END",
        )
        .execute(pool)
        .await
        .expect("create pin failure trigger");

        let replacement_json = serde_json::json!([
            { "id": "new-pin", "hex": "#111111", "rgb": { "r": 17.0, "g": 17.0, "b": 17.0 }, "notes": "" },
            { "id": "boom", "hex": "#222222", "rgb": { "r": 34.0, "g": 34.0, "b": 34.0 }, "notes": "" }
        ])
        .to_string();
        let err = save_pinned_colors_in_pool(pool, project_id, &replacement_json)
            .await
            .expect_err("mid-transaction pin insert failure should roll back");
        assert!(err.contains("simulated mid-transaction pin failure"));

        let loaded = load_pinned_colors_in_pool(pool, project_id)
            .await
            .expect("load pinned colors after rollback");
        let parsed: Vec<serde_json::Value> =
            serde_json::from_str(&loaded).expect("parse pinned colors");
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0]["id"], "orig-pin");
        assert_eq!(parsed[0]["notes"], "Keep me");
    }

    #[tokio::test]
    async fn shared_pool_is_idempotent_and_handles_concurrent_reads_and_writes() {
        let tmp = TempDbPath::new("concurrent");
        let db = Arc::new(DbState::new());

        // Concurrent initializations must all resolve cleanly to the same shared pool.
        let mut init_handles = Vec::new();
        for _ in 0..8 {
            let db_clone = Arc::clone(&db);
            let path = tmp.db_file.clone();
            init_handles.push(tokio::spawn(async move {
                let pool = db_clone.get_or_init_at(&path).await.expect("init pool");
                pool as *const SqlitePool as usize
            }));
        }
        let mut pool_addrs = Vec::new();
        for handle in init_handles {
            pool_addrs.push(handle.await.expect("join init task"));
        }
        assert!(pool_addrs.iter().all(|&addr| addr == pool_addrs[0]));

        let pool = db
            .get_or_init_at(&tmp.db_file)
            .await
            .expect("get initialized pool");
        let project_id = create_project(pool, "Concurrent Study").await;

        // Seed initial state so readers always observe valid snapshots.
        let seed_palettes = serde_json::json!([
            { "id": "seed", "name": "Seed", "isActive": true, "isDefault": true, "colors": [] }
        ])
        .to_string();
        save_palettes_in_pool(pool, project_id, &seed_palettes)
            .await
            .expect("seed palettes");

        let mut tasks = Vec::new();
        for i in 0..12 {
            let db_clone = Arc::clone(&db);
            let path = tmp.db_file.clone();
            tasks.push(tokio::spawn(async move {
                let pool = db_clone.get_or_init_at(&path).await.expect("pool");
                let pal_json = serde_json::json!([
                    {
                        "id": format!("pal-{i}"),
                        "name": format!("Palette {i}"),
                        "isActive": true,
                        "isDefault": false,
                        "colors": ["#112233"]
                    }
                ])
                .to_string();
                save_palettes_in_pool(pool, project_id, &pal_json)
                    .await
                    .expect("concurrent palette write");

                let pin_json = serde_json::json!([
                    {
                        "id": format!("pin-{i}"),
                        "hex": "#112233",
                        "rgb": { "r": 17.0, "g": 34.0, "b": 51.0 },
                        "notes": format!("note-{i}")
                    }
                ])
                .to_string();
                save_pinned_colors_in_pool(pool, project_id, &pin_json)
                    .await
                    .expect("concurrent pinned write");

                let loaded_palettes = load_palettes_in_pool(pool, project_id)
                    .await
                    .expect("concurrent palette read");
                let pal_arr: Vec<serde_json::Value> =
                    serde_json::from_str(&loaded_palettes).expect("valid palette json");
                assert_eq!(pal_arr.len(), 1);

                let loaded_pins = load_pinned_colors_in_pool(pool, project_id)
                    .await
                    .expect("concurrent pinned read");
                let pin_arr: Vec<serde_json::Value> =
                    serde_json::from_str(&loaded_pins).expect("valid pinned json");
                assert_eq!(pin_arr.len(), 1);
            }));
        }

        for task in tasks {
            task.await.expect("concurrent task panicked");
        }
    }

    #[test]
    fn image_mime_type_allows_only_explicit_image_extensions() {
        let allowed = [
            ("photo.jpg", "image/jpeg"),
            ("photo.JPEG", "image/jpeg"),
            ("study.png", "image/png"),
            ("anim.GiF", "image/gif"),
            ("ref.webp", "image/webp"),
            ("scan.bmp", "image/bmp"),
            ("hdr.avif", "image/avif"),
            ("iphone.heic", "image/heic"),
            ("iphone.HEIF", "image/heif"),
            ("print.tif", "image/tiff"),
            ("print.TIFF", "image/tiff"),
        ];

        for (file, expected) in allowed {
            assert_eq!(
                image_mime_type_for_path(Path::new(file)),
                Some(expected),
                "expected {file} to map to {expected}"
            );
        }

        let rejected = [
            "notes.txt",
            ".env",
            "/Users/artist/.env",
            "config.env",
            "vector.svg",
            "page.html",
            "data.json",
            "doc.pdf",
            "Makefile",
            "png",
            ".png",
            "",
        ];

        for file in rejected {
            assert_eq!(
                image_mime_type_for_path(Path::new(file)),
                None,
                "expected {file:?} to be rejected"
            );
        }
    }

    #[tokio::test]
    async fn read_image_file_as_data_url_succeeds_for_all_allowed_extensions() {
        let tmp = TempDbPath::new("img_allowed");
        let payload = b"\x89PNG\r\n\x1a\nhello";
        let expected_b64 = base64::engine::general_purpose::STANDARD.encode(payload);

        let cases = [
            ("a.jpg", "image/jpeg"),
            ("b.jpeg", "image/jpeg"),
            ("c.PNG", "image/png"),
            ("d.gif", "image/gif"),
            ("e.webp", "image/webp"),
            ("f.bmp", "image/bmp"),
            ("g.avif", "image/avif"),
            ("h.heic", "image/heic"),
            ("i.heif", "image/heif"),
            ("j.tif", "image/tiff"),
            ("k.tiff", "image/tiff"),
        ];

        for (name, mime) in cases {
            let file_path = tmp.dir.join(name);
            std::fs::write(&file_path, payload).expect("write image fixture");

            let url = read_image_file_as_data_url(&file_path, MAX_IMAGE_FILE_BYTES)
                .await
                .unwrap_or_else(|e| panic!("expected {name} to succeed, got: {e}"));
            assert_eq!(url, format!("data:{mime};base64,{expected_b64}"));
        }
    }

    #[tokio::test]
    async fn read_image_file_as_data_url_rejects_disallowed_extensions_and_empty_paths() {
        let tmp = TempDbPath::new("img_disallowed");

        let empty_err = read_image_file_as_data_url(Path::new(""), MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("empty path must fail");
        assert!(empty_err.to_lowercase().contains("empty"));

        for name in ["notes.txt", ".env", "no_extension", "png", ".png", "icon.svg"] {
            let file_path = tmp.dir.join(name);
            std::fs::write(&file_path, b"secret contents").expect("write non-image fixture");

            let err = read_image_file_as_data_url(&file_path, MAX_IMAGE_FILE_BYTES)
                .await
                .expect_err("disallowed extension must fail");
            assert!(
                err.to_lowercase().contains("unsupported image file type"),
                "expected unsupported-type error for {name}, got: {err}"
            );
        }

        // Non-existent non-image path should also fail with unsupported type rather than leaking existence.
        let missing_env = tmp.dir.join("missing.env");
        let err = read_image_file_as_data_url(&missing_env, MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("missing .env must fail");
        assert!(err.to_lowercase().contains("unsupported image file type"));
    }

    #[tokio::test]
    async fn read_image_file_as_data_url_rejects_directories() {
        let tmp = TempDbPath::new("img_dirs");

        let plain_dir = tmp.dir.join("folder");
        std::fs::create_dir_all(&plain_dir).expect("create plain dir");
        let err = read_image_file_as_data_url(&plain_dir, MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("directory must be rejected");
        assert!(
            err.to_lowercase().contains("directory"),
            "expected directory error, got: {err}"
        );

        // Even a directory whose name ends in `.png` must be rejected as a directory.
        let sneaky_dir = tmp.dir.join("sneaky.png");
        std::fs::create_dir_all(&sneaky_dir).expect("create sneaky.png dir");
        let err = read_image_file_as_data_url(&sneaky_dir, MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("directory with .png suffix must be rejected");
        assert!(
            err.to_lowercase().contains("directory"),
            "expected directory error for sneaky.png, got: {err}"
        );
    }

    #[tokio::test]
    async fn read_image_file_as_data_url_enforces_size_limit_before_reading() {
        let tmp = TempDbPath::new("img_oversize");

        // Exact boundary passes; 1 byte over fails.
        let exact_path = tmp.dir.join("exact.png");
        std::fs::write(&exact_path, vec![0xAB; 16]).expect("write 16-byte image");
        let ok = read_image_file_as_data_url(&exact_path, 16)
            .await
            .expect("exact-limit file should succeed");
        assert!(ok.starts_with("data:image/png;base64,"));

        let over_path = tmp.dir.join("over.png");
        std::fs::write(&over_path, vec![0xAB; 17]).expect("write 17-byte image");
        let err = read_image_file_as_data_url(&over_path, 16)
            .await
            .expect_err("1 byte over limit must fail");
        assert!(
            err.to_lowercase().contains("too large"),
            "expected size-limit error, got: {err}"
        );

        // Production 50 MB cap tested via sparse file length so metadata check rejects without allocating 50 MB.
        let huge_path = tmp.dir.join("huge.jpg");
        let huge_file = std::fs::File::create(&huge_path).expect("create sparse file");
        huge_file
            .set_len(MAX_IMAGE_FILE_BYTES + 1)
            .expect("set sparse length over 50 MB");
        drop(huge_file);

        let err = read_image_file_as_data_url(&huge_path, MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("file over 50 MB must be rejected");
        assert!(
            err.to_lowercase().contains("too large") && err.contains("50.0 MB"),
            "expected clear 50 MB error, got: {err}"
        );
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn read_image_file_as_data_url_rejects_symlink_to_non_image_target() {
        use std::os::unix::fs::symlink;

        let tmp = TempDbPath::new("img_symlink");
        let target = tmp.dir.join("secret.txt");
        std::fs::write(&target, b"private").expect("write secret target");
        let link = tmp.dir.join("disguised.png");
        symlink(&target, &link).expect("create symlink");

        let err = read_image_file_as_data_url(&link, MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("symlink pointing to .txt must be rejected");
        assert!(
            err.to_lowercase().contains("unsupported image file type"),
            "expected unsupported-type error for symlink target, got: {err}"
        );

        // Symlink pointing to a valid image succeeds and uses the resolved target's MIME type.
        let valid_target = tmp.dir.join("real.jpg");
        std::fs::write(&valid_target, b"\xff\xd8\xff\xe0").expect("write valid jpg");
        let valid_link = tmp.dir.join("alias.png");
        symlink(&valid_target, &valid_link).expect("create valid image symlink");
        let ok = read_image_file_as_data_url(&valid_link, MAX_IMAGE_FILE_BYTES)
            .await
            .expect("symlink pointing to valid image should succeed");
        assert!(ok.starts_with("data:image/jpeg;base64,"));
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn read_image_file_as_data_url_rejects_non_regular_files() {
        use std::os::unix::fs::symlink;

        let tmp = TempDbPath::new("img_non_regular");

        // Character device (/dev/null) via image-extension symlink must be rejected before opening.
        let devnull_link = tmp.dir.join("device.png");
        symlink(Path::new("/dev/null"), &devnull_link).expect("symlink to /dev/null");
        let err = read_image_file_as_data_url(&devnull_link, MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("character device must be rejected");
        assert!(
            err.to_lowercase().contains("not a regular file"),
            "expected non-regular file error for /dev/null, got: {err}"
        );

        // Named pipe (FIFO) with image extension must be rejected before opening (otherwise open blocks).
        let fifo_path = tmp.dir.join("stream.png");
        let status = std::process::Command::new("mkfifo")
            .arg(&fifo_path)
            .status()
            .expect("run mkfifo");
        assert!(status.success(), "mkfifo failed");
        let err = read_image_file_as_data_url(&fifo_path, MAX_IMAGE_FILE_BYTES)
            .await
            .expect_err("FIFO must be rejected");
        assert!(
            err.to_lowercase().contains("not a regular file"),
            "expected non-regular file error for FIFO, got: {err}"
        );
    }
}

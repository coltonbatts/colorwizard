use tauri::Manager;

#[tauri::command]
pub fn cw_validate_license_key(key: String) -> Result<bool, String> {
    Ok(crate::license::validate_license_key(&key))
}

#[tauri::command]
pub fn cw_set_license_key(app: tauri::AppHandle, key: String) -> Result<String, String> {
    use std::fs;

    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let key_path = config_dir.join("license.key");
    fs::write(&key_path, &key).map_err(|e| format!("Failed to write license: {}", e))?;

    Ok(key)
}

#[tauri::command]
pub fn cw_get_license_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use std::fs;

    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    let key_path = config_dir.join("license.key");
    if key_path.exists() {
        let key = fs::read_to_string(&key_path).map_err(|e| e.to_string())?;
        let key = key.trim().to_string();
        if crate::license::validate_license_key(&key) {
            Ok(Some(key))
        } else {
            // Invalid key on disk, remove it
            fs::remove_file(&key_path).ok();
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

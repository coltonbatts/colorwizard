mod commands;
mod license;
mod license_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::cw_init_database,
            commands::cw_create_project,
            commands::cw_list_projects,
            commands::cw_get_project,
            commands::cw_update_project,
            commands::cw_delete_project,
            commands::cw_save_palettes,
            commands::cw_load_palettes,
            commands::cw_save_pinned_colors,
            commands::cw_load_pinned_colors,
            commands::cw_set_app_setting,
            commands::cw_get_app_setting,
            license_commands::cw_validate_license_key,
            license_commands::cw_set_license_key,
            license_commands::cw_get_license_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn db_create_loadout(
    uuid: String,
    name: String,
    weapon: Option<String>,
    weapon_tt: f64,
    amp: Option<String>,
    amp_tt: f64,
    sight: Option<String>,
    sight_tt: f64,
    scope: Option<String>,
    scope_tt: f64,
    armor: Option<String>,
    notes: Option<String>,
    is_favorite: bool,
    is_active: bool,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO loadouts (uuid, name, weapon, weapon_tt, amp, amp_tt, sight, sight_tt, scope, scope_tt, armor, notes, is_favorite, is_active) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![uuid, name, weapon, weapon_tt, amp, amp_tt, sight, sight_tt, scope, scope_tt, armor, notes, if is_favorite { 1 } else { 0 }, if is_active { 1 } else { 0 }],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_delete_loadout(uuid: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM loadouts WHERE uuid = ?1", params![uuid])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_all_loadouts(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, name, weapon, weapon_tt, amp, amp_tt, sight, sight_tt, scope, scope_tt, armor, notes, is_favorite, is_active FROM loadouts")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "weapon": row.get::<_, Option<String>>(2)?,
                "weaponTT": row.get::<_, f64>(3)?,
                "amp": row.get::<_, Option<String>>(4)?,
                "ampTT": row.get::<_, f64>(5)?,
                "sight": row.get::<_, Option<String>>(6)?,
                "sightTT": row.get::<_, f64>(7)?,
                "scope": row.get::<_, Option<String>>(8)?,
                "scopeTT": row.get::<_, f64>(9)?,
                "armor": row.get::<_, Option<String>>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "isFavorite": row.get::<_, i64>(12)? != 0,
                "isActive": row.get::<_, i64>(13)? != 0,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut loadouts = Vec::new();
    for row in rows {
        loadouts.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(loadouts))
}

// ========== ITEM TEMPLATES ==========

#[tauri::command]
pub fn db_add_item_template(
    uuid: String,
    name: String,
    category: String,
    default_tt_value: f64,
    default_markup: f64,
    default_fixed_value: Option<f64>,
    description: Option<String>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO item_templates (uuid, name, category, default_tt_value, default_markup, default_fixed_value, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![uuid, name, category, default_tt_value, default_markup, default_fixed_value, description],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_delete_item_template(uuid: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM item_templates WHERE uuid = ?1", params![uuid])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_all_item_templates(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, name, category, default_tt_value, default_markup, default_fixed_value, description FROM item_templates")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "category": row.get::<_, String>(2)?,
                "defaultTTValue": row.get::<_, f64>(3)?,
                "defaultMarkup": row.get::<_, f64>(4)?,
                "defaultFixedValue": row.get::<_, Option<f64>>(5)?,
                "description": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut templates = Vec::new();
    for row in rows {
        templates.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(templates))
}

// ========== SETTINGS ==========

#[tauri::command]
pub fn db_set_setting(key: String, value: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_setting(key: String, state: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row([key], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn db_get_all_settings(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut settings = serde_json::Map::new();
    for row in rows {
        let (key, value) = row.map_err(|e| e.to_string())?;
        settings.insert(key, json!(value));
    }
    Ok(json!(settings))
}

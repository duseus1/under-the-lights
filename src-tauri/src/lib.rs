use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::Manager;

const MAX_BYTES: usize = 8_000_000;

fn connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = match std::env::var_os("UNDER_THE_LIGHTS_DATA_DIR") {
        Some(value) => {
            let path = std::path::PathBuf::from(value);
            if !path.is_absolute() {
                return Err("Custom data directory must be absolute.".into());
            }
            path
        }
        None => app.path().app_data_dir().map_err(|e| e.to_string())?,
    };
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    let db = Connection::open(path.join("career.sqlite3")).map_err(|e| e.to_string())?;
    db.busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
        CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), data TEXT NOT NULL);").map_err(|e| e.to_string())?;
    Ok(db)
}

fn validate(data: &str) -> Result<(), String> {
    if data.len() > MAX_BYTES {
        return Err("Save exceeds the 8 MB limit.".into());
    }
    let value: serde_json::Value = serde_json::from_str(data).map_err(|e| e.to_string())?;
    if value["version"] != 1 || !value["careers"].is_array() {
        return Err("Invalid save envelope.".into());
    }
    Ok(())
}

#[tauri::command]
fn load_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    connection(&app)?
        .query_row("SELECT data FROM app_state WHERE id=1", [], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())
}

fn persist(db: &mut Connection, data: &str) -> Result<(), String> {
    validate(data)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO backups(data) SELECT data FROM app_state WHERE id=1",
        [],
    )
    .map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO app_state(id,data) VALUES(1,?1) ON CONFLICT(id) DO UPDATE SET data=excluded.data", params![data]).map_err(|e| e.to_string())?;
    tx.execute(
        "DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY id DESC LIMIT 10)",
        [],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_state(app: tauri::AppHandle, data: String) -> Result<(), String> {
    persist(&mut connection(&app)?, &data)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Backup {
    id: i64,
    created_at: String,
    data: String,
}

#[tauri::command]
fn list_backups(app: tauri::AppHandle) -> Result<Vec<Backup>, String> {
    let db = connection(&app)?;
    let mut stmt = db
        .prepare("SELECT id,created_at,data FROM backups ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Backup {
                id: r.get(0)?,
                created_at: r.get(1)?,
                data: r.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_save(data: String) -> Result<bool, String> {
    validate(&data)?;
    let file = rfd::AsyncFileDialog::new()
        .set_file_name("under-the-lights-backup.json")
        .add_filter("Career save", &["json"])
        .save_file()
        .await;
    if let Some(file) = file {
        std::fs::write(file.path(), data).map_err(|e| e.to_string())?;
        return Ok(true);
    }
    Ok(false)
}

#[tauri::command]
async fn import_save() -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Career save", &["json"])
        .pick_file()
        .await;
    if let Some(file) = file {
        if std::fs::metadata(file.path())
            .map_err(|e| e.to_string())?
            .len()
            > MAX_BYTES as u64
        {
            return Err("Save exceeds the 8 MB limit.".into());
        }
        return std::fs::read_to_string(file.path())
            .map(Some)
            .map_err(|e| e.to_string());
    }
    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            list_backups,
            export_save,
            import_save
        ])
        .run(tauri::generate_context!())
        .expect("Unable to start Under the Lights");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn saves_and_backups_are_atomic_and_bounded() {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE app_state(id INTEGER PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE backups(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,data TEXT NOT NULL);").unwrap();
        for n in 0..15 {
            persist(&mut db, &format!(r#"{{"version":1,"careers":[],"n":{n}}}"#)).unwrap();
        }
        let count: i64 = db
            .query_row("SELECT count(*) FROM backups", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 10);
        assert!(persist(&mut db, "not json").is_err());
        let data: String = db
            .query_row("SELECT data FROM app_state", [], |r| r.get(0))
            .unwrap();
        assert!(data.contains("14"));
        db.execute_batch("CREATE TRIGGER reject_update BEFORE UPDATE ON app_state BEGIN SELECT RAISE(ABORT,'simulated write failure'); END;").unwrap();
        assert!(persist(&mut db, r#"{"version":1,"careers":[],"n":15}"#).is_err());
        let unchanged: String = db
            .query_row("SELECT data FROM app_state", [], |r| r.get(0))
            .unwrap();
        let latest: String = db
            .query_row(
                "SELECT data FROM backups ORDER BY id DESC LIMIT 1",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(unchanged, data);
        assert!(latest.contains("13"));
    }
}

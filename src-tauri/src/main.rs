// ─────────────────────────────
// FlowCreativeStudio · Flow
// github.com/NayrolfRdgs
// ─────────────────────────────

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    keyfolio_lib::run()
}

//! GidiReads desktop app — Rust + eframe/egui.
//!
//! A native desktop port of the GidiReads web experience:
//! stories you can browse, save to your library, and read.
//!
//! Auth uses Supabase with the same project credentials as the web app.
//! The `--screenshot <file.png>` flag renders a short warm-up then saves
//! the current window as a PNG and exits — used for build verification.

use std::path::PathBuf;

use chrono::{DateTime, Utc};
use egui::{Color32, RichText, Vec2};
use eframe::egui;
use eframe::App;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use url::Url;

use crate::supabase::SupabaseClient;
use crate::ui::palette::{GidiPalette, GidiTheme};

mod app;
mod models;
mod supabase;
mod ui;

use app::{AppState, Screen};

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1100.0, 800.0])
            .with_min_inner_size([900.0, 650.0])
            .with_title("GidiReads — Stories begin here"),
        ..Default::default()
    };

    let args: Vec<String> = std::env::args().collect();
    let screenshot_path: Option<PathBuf> = if args.len() >= 3 && args[1] == "--screenshot" {
        Some(PathBuf::from(&args[2]))
    } else {
        None
    };

    eframe::run_simple_native("GidiReads", options, move |ctx, _frame| {
        let mut app = AppState::default();
        if let Some(path) = &screenshot_path {
            app.do_screenshot(ctx, path);
        } else {
            app.update(ctx, None);
        }
    })
}

pub fn run_app() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1100.0, 800.0])
            .with_min_inner_size([900.0, 650.0])
            .with_title("GidiReads — Stories begin here"),
        ..Default::default()
    };
    eframe::run_native(
        "GidiReads",
        options,
        Box::new(|_cc| Box::new(AppState::default())),
    )
}
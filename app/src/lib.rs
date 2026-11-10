//! GidiReads desktop app — modules.

mod app;
mod models;
mod supabase;
mod ui;

pub use app::AppState;
pub use models::{Story, UserProfile, Chapter};
pub use supabase::SupabaseClient;
pub use ui::palette::{GidiPalette, GidiTheme};
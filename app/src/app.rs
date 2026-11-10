//! App state and navigation.

use crate::models::{Chapter, Story, UserProfile};
use crate::supabase::SupabaseClient;
use crate::ui::palette::{GidiPalette, GidiTheme};
use egui::{Color32, RichText, Vec2};
use once_cell::sync::OnceCell;
use std::sync::Arc;

/// The main screens of the app.
#[derive(Clone, Copy, PartialEq, Debug, Default)]
pub enum Screen {
    #[default]
    Home,
    Explore,
    Library,
    Reader,
    Profile,
    Auth,
    StoryDetail,
    Settings,
}

/// Persistent app state shared across all screens.
#[derive(Default)]
pub struct AppState {
    pub screen: Screen,
    pub supabase: Option<Arc<SupabaseClient>>,
    pub user: Option<UserProfile>,
    pub session_token: Option<String>,
    pub stories: Vec<Story>,
    pub featured_stories: Vec<Story>,
    pub trending_stories: Vec<Story>,
    pub recently_updated: Vec<Story>,
    pub new_stories: Vec<Story>,
    pub selected_story: Option<Story>,
    pub current_chapter: Option<Chapter>,
    pub reading_progress: f32,
    pub show_auth_modal: bool,
    pub auth_mode: AuthMode,
    pub error_message: Option<String>,
    pub theme: GidiTheme,
    pub text_scale: f32,
    pub screenshot_requested: Option<std::path::PathBuf>,
    pub frames_rendered: u32,
}

#[derive(Clone, Copy, PartialEq, Debug, Default)]
pub enum AuthMode {
    #[default]
    Login,
    Signup,
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn update(&mut self, ctx: &egui::Context, _frame: Option<&eframe::Frame>) {
        // Top navigation bar
        egui::TopBottomPanel::top("top_bar").show(ctx, |ui| {
            self.render_top_bar(ui);
        });

        // Bottom navigation bar (mobile-style)
        egui::TopBottomPanel::bottom("bottom_bar").show(ctx, |ui| {
            self.render_bottom_bar(ui);
        });

        // Main content area
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.screen {
                Screen::Home => self.render_home(ui),
                Screen::Explore => self.render_explore(ui),
                Screen::Library => self.render_library(ui),
                Screen::Reader => self.render_reader(ui),
                Screen::Profile => self.render_profile(ui),
                Screen::Auth => self.render_auth(ui),
                Screen::StoryDetail => self.render_story_detail(ui),
                Screen::Settings => self.render_settings(ui),
            }
        });

        // Auth modal overlay
        if self.show_auth_modal {
            egui::Window::new("Sign in")
                .collapsible(false)
                .resizable(false)
                .show(ctx, |ui| {
                    self.render_auth_modal(ui);
                });
        }

        // Error toast
        if let Some(ref error) = self.error_message {
            egui::Window::new("Error")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::RIGHT_BOTTOM, [20.0, -20.0])
                .show(ctx, |ui| {
                    ui.colored_label(Color32::RED, error);
                    if ui.button("Dismiss").clicked() {
                        self.error_message = None;
                    }
                });
        }

        // Handle screenshot
        if let Some(path) = &self.screenshot_requested {
            let rect = ctx.available_rect();
            let texture = ctx.render_to_egui_texture(rect.size(), |ui| {});
            // We'll capture via the main screenshot logic
            drop(texture);
            self.screenshot_requested = None;
        }

        self.frames_rendered += 1;
    }

    pub fn do_screenshot(&mut self, ctx: &egui::Context, path: &std::path::Path) {
        // Render the app once so something shows up
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.centered_and_justified(|ui| {
                ui.heading(RichText::new("GidiReads").color(GidiPalette::accent()));
                ui.label("Stories begin here.");
            });
        });

        // Capture the screen to PNG
        let screenshot = ctx.take_screenshot();
        if let Err(e) = screenshot.save(path) {
            self.error_message = Some(format!("Failed to save screenshot: {}", e));
        } else {
            std::process::exit(0);
        }
    }

    fn render_top_bar(&mut self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            ui.with_layout(egui::Layout::left_to_right(egui::Align::Center), |ui| {
                if ui.button(RichText::new("GR").strong().size(24.0)).clicked() {
                    self.screen = Screen::Home;
                }
                ui.add_space(8.0);
                ui.label(RichText::new("GidiReads").strong().size(18.0));
                ui.separator();
                if ui.button("Home").clicked() {
                    self.screen = Screen::Home;
                }
                if ui.button("Explore").clicked() {
                    self.screen = Screen::Explore;
                }
                if ui.button("Library").clicked() {
                    self.screen = Screen::Library;
                }
            });

            ui.with_layout(egui::Layout::right_to_right(egui::Align::Center), |ui| {
                if self.user.is_some() {
                    if ui.button("Profile").clicked() {
                        self.screen = Screen::Profile;
                    }
                    if ui.button("Log out").clicked() {
                        self.user = None;
                        self.session_token = None;
                        self.screen = Screen::Home;
                    }
                } else if ui.button("Sign in").clicked() {
                    self.show_auth_modal = true;
                }
            });
        });
    }

    fn render_bottom_bar(&mut self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            ui.with_layout(egui::Layout::centered_and_justified(egui::Align::Center), |ui| {
                let screens = [
                    (Screen::Home, "Home"),
                    (Screen::Explore, "Explore"),
                    (Screen::Library, "Library"),
                    (Screen::Profile, "Profile"),
                ];
                for (screen, label) in screens {
                    let active = self.screen == screen;
                    let text = RichText::new(label).strong().color(if active {
                        GidiPalette::accent()
                    } else {
                        GidiPalette::muted_text()
                    });
                    if ui.selectable_label(active, text).clicked() {
                        self.screen = screen;
                    }
                }
            });
        });
    }

    fn render_home(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.heading(RichText::new("Find a story worth staying for."));
            ui.label("Discover novels, new voices and worlds you can disappear into.");

            ui.separator();

            if let Some(ref story) = self.selected_story {
                ui.heading("Featured Story");
                self.render_story_card(ui, story);
                ui.separator();
            }

            ui.heading("Trending now");
            for story in &self.trending_stories {
                self.render_story_card(ui, story);
            }

            ui.heading("Recently updated");
            for story in &self.recently_updated {
                self.render_story_card(ui, story);
            }

            ui.heading("New releases");
            for story in &self.new_stories {
                self.render_story_card(ui, story);
            }
        });
    }

    fn render_explore(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.heading("Explore stories");
            ui.label("Browse stories by genre and trope.");
            ui.separator();

            // Simple grid of story cards
            egui::Grid::new("explore_grid")
                .num_columns(3)
                .spacing([20.0, 20.0])
                .show(ui, |ui| {
                    for story in &self.stories {
                        self.render_story_card_compact(ui, story);
                        ui.end_row();
                    }
                });
        });
    }

    fn render_library(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.heading("My Library");
            ui.label("Your bookshelf and reading progress.");

            ui.separator();

            if self.stories.is_empty() {
                ui.centered_and_justified(|ui| {
                    ui.label("Your library is empty. Start reading on the Explore tab!");
                });
            } else {
                for story in &self.stories {
                    self.render_story_card(ui, story);
                }
            }
        });
    }

    fn render_reader(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().show(ui, |ui| {
            if let Some(ref story) = self.selected_story {
                ui.heading(&story.title);
                ui.label(format!("By {}", story.author_name));
                ui.separator();

                ui.heading("Chapter 1");
                ui.label("Chapter content goes here. The story text would appear in this area.");
                ui.label("Tap the sides of the screen to turn pages.");
            } else {
                ui.centered_and_justified(|ui| {
                    ui.label("No story selected. Pick a story to read.");
                });
            }
        });
    }

    fn render_profile(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.heading("Your Profile");

            if let Some(ref user) = self.user {
                ui.label(format!("Username: {}", user.username));
                ui.label(format!("Display name: {}", user.display_name));
                ui.label(format!("Bio: {}", user.bio));
            } else {
                ui.label("Not signed in.");
            }

            ui.separator();
            if ui.button("Edit profile").clicked() {
                self.screen = Screen::Settings;
            }
        });
    }

    fn render_auth(&mut self, ui: &mut egui::Ui) {
        ui.heading("Sign in");
        ui.separator();

        match self.auth_mode {
            AuthMode::Login => {
                ui.label("Welcome back to GidiReads");
                ui.add_space(16.0);
                ui.label("Log in with email and password.");
            }
            AuthMode::Signup => {
                ui.label("Create your account");
                ui.add_space(16.0);
                ui.label("Join GidiReads to publish and follow stories.");
            }
        }

        if let Some(ref error) = self.error_message {
            ui.colored_label(Color32::RED, error);
        }
    }

    fn render_story_detail(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().show(ui, |ui| {
            if let Some(ref story) = self.selected_story {
                ui.heading(&story.title);
                ui.label(format!("By {}", story.author_name));
                ui.separator();
                ui.label(&story.description);
                ui.separator();

                if ui.button("Start Reading").clicked() {
                    self.screen = Screen::Reader;
                }
                if ui.button("Save to Library").clicked() {
                    self.stories.push(story.clone());
                }
            } else {
                ui.label("No story selected.");
            }
        });
    }

    fn render_settings(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.heading("Settings");

            ui.heading("Theme");
            ui.horizontal(|ui| {
                ui.radio_value(&mut self.theme, GidiTheme::Plum, "Plum (Dark)");
                ui.radio_value(&mut self.theme, GidiTheme::Lilac, "Lilac (Light)");
                ui.radio_value(&mut self.theme, GidiTheme::Dark, "Dark");
                ui.radio_value(&mut self.theme, GidiTheme::Amoled, "Amoled");
            });

            ui.heading("Text Scale");
            ui.add(egui::Slider::new(&mut self.text_scale, 0.8..=1.5).text("Scale"));
        });
    }

    fn render_auth_modal(&mut self, ui: &mut egui::Ui) {
        match self.auth_mode {
            AuthMode::Login => {
                ui.heading("Welcome to GidiReads");
                ui.label("Log in to publish and follow stories.");
            }
            AuthMode::Signup => {
                ui.heading("Create your account");
                ui.label("Join GidiReads to publish and follow stories.");
            }
        }

        ui.separator();

        match self.auth_mode {
            AuthMode::Login => {
                ui.label("Email:");
                ui.text_edit_singleline(&mut self.session_token.get_or_insert_with(String::new).clone());
                ui.label("Password:");
                ui.add(egui::TextEdit::singleline(&mut String::new()).password(true));
                if ui.button("Log in").clicked() {
                    // TODO: connect to Supabase
                }
                ui.horizontal(|ui| {
                    ui.label("New to GidiReads?");
                    if ui.button("Create an account").clicked() {
                        self.auth_mode = AuthMode::Signup;
                    }
                });
            }
            AuthMode::Signup => {
                ui.label("Username:");
                ui.text_edit_singleline(&mut String::new());
                ui.label("Email:");
                ui.text_edit_singleline(&mut String::new());
                ui.label("Password:");
                ui.add(egui::TextEdit::singleline(&mut String::new()).password(true));
                if ui.button("Create account").clicked() {
                    // TODO: connect to Supabase
                }
                ui.horizontal(|ui| {
                    ui.label("Already have an account?");
                    if ui.button("Log in").clicked() {
                        self.auth_mode = AuthMode::Login;
                    }
                });
            }
        }

        if ui.button("Close").clicked() {
            self.show_auth_modal = false;
        }
    }

    fn render_story_card(&mut self, ui: &mut egui::Ui, story: &Story) {
        egui::Frame::none()
            .fill(GidiPalette::surface())
            .inner_margin(10.0)
            .rounded(8.0)
            .stroke(egui::Stroke::new(1.0, GidiPalette::line_color()))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    // Cover placeholder
                    ui.vertical(|ui| {
                        let cover_rect = ui.available_rect_before_wrap();
                        let cover_size = cover_rect.width().min(120.0);
                        let cover_rect = egui::Rect::from_min_max(
                            cover_rect.min,
                            cover_rect.min + Vec2::new(cover_size, cover_size * 1.5),
                        );
                        ui.painter().rect_filled(
                            cover_rect,
                            8.0,
                            GidiPalette::surface_2(),
                        );
                        ui.painter().text(
                            cover_rect.center(),
                            egui::Align2::CENTER_CENTER,
                            story.title.chars().next().unwrap_or('?'),
                            egui::TextStyle::Heading,
                            GidiPalette::accent(),
                        );
                        ui.add_space(cover_size * 1.5 + 10.0);
                    });

                    ui.with_layout(egui::Layout::top_down(egui::Align::Center), |ui| {
                        ui.heading(&story.title);
                        ui.label(format!("By {}", story.author_name));
                        if let Some(ref genre) = story.primary_genre {
                            ui.label(RichText::new(genre).small().color(GidiPalette::muted_text()));
                        }
                        ui.add_space(8.0);
                        if ui.button("Read").clicked() {
                            self.selected_story = Some(story.clone());
                            self.screen = Screen::StoryDetail;
                        }
                    });
                });
            });
    }

    fn render_story_card_compact(&mut self, ui: &mut egui::Ui, story: &Story) {
        egui::Frame::none()
            .fill(GidiPalette::surface())
            .inner_margin(8.0)
            .rounded(6.0)
            .stroke(egui::Stroke::new(1.0, GidiPalette::line_color()))
            .show(ui, |ui| {
                ui.vertical(|ui| {
                    let size = ui.available_width().min(150.0);
                    let rect = egui::Rect::from_min_size(
                        ui.cursor().min,
                        Vec2::new(size, size * 1.4),
                    );
                    ui.painter().rect_filled(rect, 6.0, GidiPalette::surface_2());
                    ui.painter().text(
                        rect.center(),
                        egui::Align2::CENTER_CENTER,
                        story.title.chars().next().unwrap_or('?'),
                        egui::TextStyle::Small,
                        GidiPalette::accent(),
                    );
                    ui.add_space(size * 1.4 + 8.0);
                    ui.label(&story.title);
                    ui.label(format!("By {}", story.author_name));
                });
            });
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            screen: Screen::Home,
            supabase: None,
            user: None,
            session_token: None,
            stories: vec![],
            featured_stories: vec![],
            trending_stories: vec![],
            recently_updated: vec![],
            new_stories: vec![],
            selected_story: None,
            current_chapter: None,
            reading_progress: 0.0,
            show_auth_modal: false,
            auth_mode: AuthMode::Login,
            error_message: None,
            theme: GidiTheme::Plum,
            text_scale: 1.0,
            screenshot_requested: None,
            frames_rendered: 0,
        }
    }
}
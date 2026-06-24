#[derive(serde::Deserialize)]
pub struct AnalyticsStatsRangeParams {
    pub(super) start_time: Option<i64>,
    pub(super) end_time: Option<i64>,
    pub(super) tags: Option<Vec<String>>,
}

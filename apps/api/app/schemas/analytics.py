from datetime import date
from pydantic import BaseModel


class WeeklyBookingCount(BaseModel):
    week_start: date
    count: int
    completed: int


class ProviderAnalytics(BaseModel):
    total_bookings: int
    completed_bookings: int
    completion_rate: float
    unique_customers: int
    avg_rating: float
    review_count: int
    weekly_trend: list[WeeklyBookingCount]

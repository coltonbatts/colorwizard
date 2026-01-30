#!/usr/bin/env python3
"""
ColorWizard Weekly Dashboard Auto-Pull Script

This script automatically pulls metrics from PostHog + Stripe and generates
a weekly dashboard report.

Usage:
    python colorwizard_dashboard_auto_pull.py --week 2025-02-10

Requirements:
    pip install requests python-dotenv
    
Setup:
    1. Get PostHog API key from https://posthog.com/settings
    2. Get Stripe API key from https://dashboard.stripe.com/apikeys
    3. Create .env file with:
        POSTHOG_API_KEY=phc_xxxxx
        POSTHOG_PROJECT_ID=xxxxx
        STRIPE_SECRET_KEY=sk_live_xxxxx
    4. Run this script weekly
"""

import os
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any
import requests
from dotenv import load_dotenv

load_dotenv()

POSTHOG_API_KEY = os.getenv("POSTHOG_API_KEY")
POSTHOG_PROJECT_ID = os.getenv("POSTHOG_PROJECT_ID")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")

# Validate credentials
if not all([POSTHOG_API_KEY, POSTHOG_PROJECT_ID, STRIPE_SECRET_KEY]):
    print("❌ Missing API keys. Create .env with:")
    print("   POSTHOG_API_KEY=phc_xxxxx")
    print("   POSTHOG_PROJECT_ID=xxxxx")
    print("   STRIPE_SECRET_KEY=sk_live_xxxxx")
    sys.exit(1)


class PostHogClient:
    """PostHog API client for fetching analytics"""
    
    def __init__(self, api_key: str, project_id: str):
        self.api_key = api_key
        self.project_id = project_id
        self.base_url = "https://posthog.com/api"
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def get_events(
        self,
        event_name: str,
        date_from: str,
        date_to: str,
        group_by: str = None
    ) -> Dict[str, Any]:
        """Fetch events from PostHog"""
        
        filters = {
            "events": [{"id": event_name, "type": "events"}],
            "date_from": date_from,
            "date_to": date_to,
        }
        
        if group_by:
            filters["breakdown"] = group_by
            filters["breakdown_type"] = "event"
        
        url = f"{self.base_url}/projects/{self.project_id}/insights/"
        
        payload = {
            "name": f"Temp: {event_name}",
            "description": "Auto-generated query",
            "filters": filters,
        }
        
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_funnel(
        self,
        events: List[str],
        date_from: str,
        date_to: str
    ) -> Dict[str, Any]:
        """Fetch funnel data"""
        
        url = f"{self.base_url}/projects/{self.project_id}/insights/"
        
        filters = {
            "events": [{"id": event, "type": "events"} for event in events],
            "date_from": date_from,
            "date_to": date_to,
        }
        
        payload = {
            "name": f"Temp: Funnel {' -> '.join(events)}",
            "filters": filters,
            "insight": "FUNNEL",
        }
        
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()


class StripeClient:
    """Stripe API client for fetching payment data"""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.base_url = "https://api.stripe.com/v1"
        self.headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
    
    def get_charges(self, date_from: int, date_to: int) -> List[Dict]:
        """Fetch successful charges in date range"""
        
        url = f"{self.base_url}/charges"
        params = {
            "created[gte]": date_from,
            "created[lte]": date_to,
            "status": "succeeded",
            "limit": 100,
        }
        
        response = requests.get(url, params=params, headers=self.headers)
        response.raise_for_status()
        return response.json().get("data", [])
    
    def get_customers(self) -> List[Dict]:
        """Fetch all customers (for tracking who upgraded)"""
        
        url = f"{self.base_url}/customers"
        params = {"limit": 100}
        
        response = requests.get(url, params=params, headers=self.headers)
        response.raise_for_status()
        return response.json().get("data", [])


def get_week_dates(week_date_str: str = None) -> tuple:
    """
    Get Monday-Sunday for a given week.
    
    Args:
        week_date_str: Date in format YYYY-MM-DD (default: today)
    
    Returns:
        (monday_iso, sunday_iso, monday_dt, sunday_dt)
    """
    
    if week_date_str:
        target_date = datetime.fromisoformat(week_date_str)
    else:
        target_date = datetime.now()
    
    # Get Monday of that week
    monday = target_date - timedelta(days=target_date.weekday())
    sunday = monday + timedelta(days=6)
    
    monday_iso = monday.strftime("%Y-%m-%d")
    sunday_iso = sunday.strftime("%Y-%m-%d")
    
    return monday_iso, sunday_iso, monday, sunday


def pull_metrics(week_date_str: str = None) -> Dict[str, Any]:
    """Pull all metrics for the weekly report"""
    
    monday_iso, sunday_iso, monday_dt, sunday_dt = get_week_dates(week_date_str)
    
    print(f"📊 Pulling ColorWizard metrics for week {monday_iso} to {sunday_iso}")
    print()
    
    metrics = {
        "week_start": monday_iso,
        "week_end": sunday_iso,
        "report_date": datetime.now().strftime("%Y-%m-%d"),
        "signups": 0,
        "pro_upgrades": 0,
        "revenue_cents": 0,
        "conversion_rate": 0,
        "by_channel": {},
        "raw_data": {},
    }
    
    # Initialize PostHog client
    ph = PostHogClient(POSTHOG_API_KEY, POSTHOG_PROJECT_ID)
    
    try:
        # 1. Pull signups by channel
        print("📈 Fetching signups...")
        signup_events = ph.get_events(
            "signup",
            date_from=monday_iso,
            date_to=sunday_iso,
            group_by="utm_source"
        )
        print(f"   ✅ Got signup events: {len(signup_events.get('result', []))} results")
        
        # 2. Pull pro upgrades by channel
        print("📈 Fetching pro upgrades...")
        upgrade_events = ph.get_events(
            "upgrade_success",
            date_from=monday_iso,
            date_to=sunday_iso,
            group_by="utm_source"
        )
        print(f"   ✅ Got upgrade events")
        
        # 3. Pull payment events
        print("💰 Fetching payments...")
        payment_events = ph.get_events(
            "payment_complete",
            date_from=monday_iso,
            date_to=sunday_iso,
            group_by="utm_source"
        )
        print(f"   ✅ Got payment events")
        
        # 4. Get funnel: signup → pro_feature_view → upgrade_click → payment_complete
        print("🔍 Fetching conversion funnel...")
        funnel = ph.get_funnel(
            ["signup", "pro_feature_view", "upgrade_click", "payment_complete"],
            date_from=monday_iso,
            date_to=sunday_iso
        )
        print(f"   ✅ Got funnel data")
        
    except Exception as e:
        print(f"   ❌ PostHog error: {e}")
        print("   (This is OK if API keys aren't set up yet)")
    
    # Initialize Stripe client
    stripe = StripeClient(STRIPE_SECRET_KEY)
    
    try:
        # Convert dates to Unix timestamps
        monday_ts = int(monday_dt.timestamp())
        sunday_ts = int(sunday_dt.timestamp())
        
        print("💳 Fetching Stripe charges...")
        charges = stripe.get_charges(monday_ts, sunday_ts)
        
        total_revenue = sum(charge["amount"] for charge in charges)
        metrics["revenue_cents"] = total_revenue
        metrics["pro_upgrades"] = len(charges)
        
        print(f"   ✅ Found {len(charges)} charges = ${total_revenue / 100:.2f}")
        
        # Extract channel data from charge metadata
        for charge in charges:
            metadata = charge.get("metadata", {})
            utm_source = metadata.get("utm_source", "unknown")
            
            if utm_source not in metrics["by_channel"]:
                metrics["by_channel"][utm_source] = {
                    "signups": 0,
                    "upgrades": 0,
                    "revenue": 0,
                }
            
            metrics["by_channel"][utm_source]["upgrades"] += 1
            metrics["by_channel"][utm_source]["revenue"] += charge["amount"]
        
    except Exception as e:
        print(f"   ❌ Stripe error: {e}")
        print("   (This is OK if API keys aren't set up yet)")
    
    # Calculate conversion rate
    if metrics["signups"] > 0:
        metrics["conversion_rate"] = (metrics["pro_upgrades"] / metrics["signups"]) * 100
    
    return metrics


def generate_report(metrics: Dict[str, Any]) -> str:
    """Generate markdown report from metrics"""
    
    report = f"""# 📊 ColorWizard Weekly Report
**Week of:** {metrics['week_start']} - {metrics['week_end']}  
**Report Date:** {metrics['report_date']}

## 📈 KEY METRICS

| Metric | This Week | Notes |
|--------|-----------|-------|
| **New Signups** | {metrics['signups']} | — |
| **Pro Upgrades** | {metrics['pro_upgrades']} | Conversions |
| **Revenue** | ${metrics['revenue_cents'] / 100:.2f} | Total this week |
| **Conversion Rate** | {metrics['conversion_rate']:.1f}% | Signups → Pro |

## 🔍 BY CHANNEL

| Channel | Signups | Upgrades | Revenue |
|---------|---------|----------|---------|
"""
    
    for channel, data in metrics['by_channel'].items():
        report += f"| {channel} | {data['signups']} | {data['upgrades']} | ${data['revenue'] / 100:.2f} |\n"
    
    report += f"""
## 📝 NOTES & ACTIONS

- Fetch automated on {metrics['report_date']}
- Next step: Manually add what worked/flopped
- Use template: COLORWIZARD_WEEKLY_DASHBOARD_TEMPLATE.md

---

*Report generated by colorwizard_dashboard_auto_pull.py*
"""
    
    return report


def main():
    """Main entry point"""
    
    week_arg = None
    if len(sys.argv) > 1:
        if sys.argv[1] == "--week" and len(sys.argv) > 2:
            week_arg = sys.argv[2]
    
    metrics = pull_metrics(week_arg)
    
    print()
    print("=" * 60)
    print("METRICS SUMMARY")
    print("=" * 60)
    print(f"Week: {metrics['week_start']} to {metrics['week_end']}")
    print(f"Signups: {metrics['signups']}")
    print(f"Pro Upgrades: {metrics['pro_upgrades']}")
    print(f"Revenue: ${metrics['revenue_cents'] / 100:.2f}")
    print(f"Conversion Rate: {metrics['conversion_rate']:.1f}%")
    print()
    
    # Generate report
    report = generate_report(metrics)
    
    # Save to file
    monday_iso = metrics['week_start']
    filename = f"memory/colorwizard-weekly-report-{monday_iso}.md"
    
    os.makedirs("memory", exist_ok=True)
    with open(filename, "w") as f:
        f.write(report)
    
    print(f"✅ Report saved to: {filename}")
    print()
    print("Next steps:")
    print("1. Open the file and add 'What Worked / What Flopped' sections")
    print("2. Add priorities for next week")
    print("3. Save and commit to git")


if __name__ == "__main__":
    main()

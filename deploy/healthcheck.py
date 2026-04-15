"""
Post-deploy smoke test. Run after each deployment to verify the new
instance is healthy before cutting over traffic.

Usage: python deploy/healthcheck.py --host https://api.mysitter.com
"""
import argparse
import sys
import time

import requests


def check(host: str) -> bool:
    endpoints = [
        ("/health", 200),
        ("/providers/search?lat=40.71&lng=-74.01&radius_miles=5", 200),
    ]
    for path, expected_status in endpoints:
        try:
            resp = requests.get(f"{host}{path}", timeout=10)
            if resp.status_code != expected_status:
                print(f"FAIL {path}: got {resp.status_code}, expected {expected_status}")
                return False
            print(f"OK   {path}")
        except requests.RequestException as exc:
            print(f"FAIL {path}: {exc}")
            return False
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MySitter post-deploy smoke test")
    parser.add_argument("--host", required=True, help="Base URL, e.g. https://api.mysitter.com")
    parser.add_argument("--retries", type=int, default=5, help="Number of attempts before failing")
    parser.add_argument("--delay", type=int, default=5, help="Seconds between retries")
    args = parser.parse_args()

    for attempt in range(1, args.retries + 1):
        print(f"Attempt {attempt}/{args.retries}...")
        if check(args.host):
            print("Healthcheck passed.")
            sys.exit(0)
        if attempt < args.retries:
            time.sleep(args.delay)

    print("Healthcheck failed after all retries.")
    sys.exit(1)

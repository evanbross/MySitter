# MySitter API Load Testing

This directory contains the Locust load testing suite for the MySitter API.

## Running Tests

1.  **Start the API server locally.** The tests are configured to run against `http://localhost:8000` by default.

2.  **Install Locust:**
    ```bash
    pip install locust
    ```

3.  **Run the load test:**
    ```bash
    locust -f load_tests/locustfile.py
    ```
    This will start the Locust web UI, typically at `http://localhost:8089`.

4.  **Start a new test in the UI.** Enter the number of users to simulate and the spawn rate (users per second), then click "Start swarming".

## Headless Mode

To run the tests without the web UI (e.g., in a CI/CD pipeline), use the `--headless` flag:

```bash
locust -f load_tests/locustfile.py --headless
```

You can override the default user count, spawn rate, and run time from the command line:

```bash
locust -f load_tests/locustfile.py --headless --users 100 --spawn-rate 10 -t 5m
```

## Interpreting Results

The primary metrics to watch in the Locust report are:

*   **Requests/s:** The overall throughput of the system.
*   **Failures:** The number of failed requests. This should be 0.
*   **Response Times (ms):**
    *   **Median (50%):** The response time that 50% of users experience.
    *   **95th percentile (p95):** The response time that 95% of users experience. This is a key indicator of "worst-case" performance for most users.

### Passing Criteria

A load test is generally considered "passing" if it meets these criteria under the target load (e.g., 100 concurrent users):

*   **p95 for `GET /providers/search`:** < 500ms
*   **p95 for `POST /bookings`:** < 1000ms (1s)
*   **Failure rate:** 0%

If response times exceed these thresholds or failures appear, it indicates a performance bottleneck that needs investigation.

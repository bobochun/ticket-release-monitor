# Safe Usage Guide

This monitor is built around a simple rule:

> Notify the user. Do not buy the ticket for the user.

## Allowed workflow

1. The monitor opens a public ticket page.
2. It checks visible text for configured keywords.
3. It notifies you when availability is likely.
4. You open the website manually.
5. You complete CAPTCHA, login, seat selection, and payment manually.

## If CAPTCHA appears

The app reports `CAPTCHA_OR_BOT_CHECK`.

It will not attempt to solve, bypass, hide, suppress, or work around the challenge.

## Frequency

Use conservative intervals:

- 180 seconds or more for normal monitoring.
- Avoid many targets from the same website.
- Avoid running many copies of the monitor.

## Good examples

- "Tell me when the page text changes from sold out to buy now."
- "Tell me when a specific event page shows availability."
- "Tell me if CAPTCHA appears so I can open it manually."

## Bad examples

- "Auto-buy when tickets appear."
- "Bypass Cloudflare."
- "Solve CAPTCHA automatically."
- "Simulate a human to pass bot detection."
- "Refresh every second."

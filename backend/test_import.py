#!/usr/bin/env python
import sys
import traceback

print("Testing imports...")
try:
    from routers import auth
    print("✓ auth imported")
except Exception as e:
    print(f"✗ auth failed: {e}")
    traceback.print_exc()

try:
    from routers import ratings
    print("✓ ratings imported")
    if hasattr(ratings, 'router'):
        print("  ✓ ratings.router exists")
    else:
        print("  ✗ ratings.router NOT FOUND")
        print(f"  Available attributes: {dir(ratings)}")
except Exception as e:
    print(f"✗ ratings failed: {e}")
    traceback.print_exc()

try:
    from routers import chat
    print("✓ chat imported")
    if hasattr(chat, 'router'):
        print("  ✓ chat.router exists")
    else:
        print("  ✗ chat.router NOT FOUND")
except Exception as e:
    print(f"✗ chat failed: {e}")
    traceback.print_exc()

try:
    from routers import stats
    print("✓ stats imported")
    if hasattr(stats, 'router'):
        print("  ✓ stats.router exists")
    else:
        print("  ✗ stats.router NOT FOUND")
except Exception as e:
    print(f"✗ stats failed: {e}")
    traceback.print_exc()

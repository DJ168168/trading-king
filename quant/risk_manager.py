import time

DAILY_MAX = 5
last_order = {}
daily_count = {}
fail = 0
fail_time = 0

def can_trade():
    global fail, fail_time
    now = time.time()
    if fail >= 2 and now - fail_time < 3600:
        return False
    if daily_count.get("BTC", 0) >= DAILY_MAX:
        return False
    return True

def order_ok():
    daily_count["BTC"] = daily_count.get("BTC", 0) + 1

def order_fail():
    global fail, fail_time
    fail += 1
    fail_time = time.time()

import requests
import time
import os
from dotenv import load_dotenv
load_dotenv()

EMAIL = os.getenv("VS_EMAIL")
PWD = os.getenv("VS_PASSWORD")
TOKEN_FILE = "/root/quant/vs_token.txt"

def refresh():
    try:
        url = "https://api.valuescan.io/api/authority/login"
        headers = {"Content-Type": "application/json"}
        data = {"phoneOrEmail": EMAIL, "code": PWD, "loginTypeEnum": 2, "endpointEnum": "WEB"}
        r = requests.post(url, json=data, timeout=15)
        if r.status_code == 200:
            token = r.json()["data"]["account_token"]
            with open(TOKEN_FILE, "w") as f:
                f.write(token)
            print(f"VS Token 刷新成功: {token[:20]}...")
            return token
    except Exception as e:
        print("VS刷新失败", e)
    return None

def get_token():
    try:
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    except:
        return refresh()

if __name__ == "__main__":
    refresh()
    while True:
        time.sleep(1800)
        refresh()

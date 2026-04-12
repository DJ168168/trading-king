import requests
import os
from dotenv import load_dotenv
load_dotenv()

TOKEN = os.getenv("TG_BOT_TOKEN")
CHAT = os.getenv("TG_CHAT_ID")

def send(text):
    if not TOKEN or not CHAT:
        return
    try:
        url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": CHAT, "text": text, "parse_mode": "HTML"}, timeout=8)
    except:
        pass

import asyncio
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager
import time

# Initialize Firebase (same as main.py)
firebase_env = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if firebase_env:
    cred = credentials.Certificate(json.loads(firebase_env))
else:
    cred_path = os.path.join(os.path.dirname(__file__), 'firebase_credentials.json')
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
    else:
        print("Missing Firebase credentials!")
        exit(1)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()
doc_ref = db.collection("system").document("now_playing")

async def get_current_media_info():
    try:
        sessions = await GlobalSystemMediaTransportControlsSessionManager.request_async()
        current_session = sessions.get_current_session()
        if current_session:
            info = await current_session.try_get_media_properties_async()
            status = current_session.get_playback_info().playback_status
            return {
                "title": info.title,
                "artist": info.artist,
                "is_playing": status == 4 # 4 means playing
            }
    except Exception as e:
        pass
    return {"title": "Nothing playing", "artist": "", "is_playing": False}

async def run_bridge():
    print("🎵 Music Bridge Started! Monitoring Windows Media...")
    last_state = None
    
    while True:
        media_info = await get_current_media_info()
        
        # Only update Firebase if the state has changed to save writes
        if media_info != last_state:
            try:
                doc_ref.set(media_info)
                print(f"Updated: {media_info['title']} by {media_info['artist']} (Playing: {media_info['is_playing']})")
                last_state = media_info
            except Exception as e:
                print(f"Failed to update Firebase: {e}")
                
        await asyncio.sleep(2) # Check every 2 seconds

if __name__ == "__main__":
    asyncio.run(run_bridge())

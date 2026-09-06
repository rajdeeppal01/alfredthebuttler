import edge_tts
import asyncio

async def generate_audio_stream(text: str):
    voice = "en-GB-RyanNeural"
    communicate = edge_tts.Communicate(text, voice)
    
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
            
    return bytes(audio_data)

def generate_audio_sync_stream(text: str):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(generate_audio_stream(text))

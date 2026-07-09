import json
import sys

from youtube_transcript_api import YouTubeTranscriptApi


def fetch_transcript(video_id, language):
    api = YouTubeTranscriptApi()
    if language == "all":
        transcript = api.fetch(video_id)
    else:
        transcript = api.fetch(video_id, languages=[language])

    snippets = []
    for item in transcript:
        snippets.append(
            {
                "text": item.text,
                "start": item.start,
                "duration": item.duration,
            }
        )

    return {
        "language": getattr(transcript, "language_code", language),
        "segments": snippets,
    }


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    result = fetch_transcript(payload["videoId"], payload.get("language", "all"))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

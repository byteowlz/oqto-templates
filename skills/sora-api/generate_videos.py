#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "openai>=2.12.0",
# ]
# ///
"""Generate videos using OpenAI Sora 2 API."""

import argparse
import re
import time
from pathlib import Path

from openai import OpenAI


def sanitize_filename(name: str) -> str:
    """Convert a title to a safe filename."""
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"\s+", "_", name)
    return name.lower()


def main():
    parser = argparse.ArgumentParser(
        description="Generate videos using OpenAI Sora 2 API"
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path.cwd(),
        help="Output directory for generated videos (default: current working directory)",
    )
    parser.add_argument(
        "-p",
        "--prompts",
        type=Path,
        default=Path(__file__).parent / "prompts.txt",
        help="Path to prompts file (default: ./prompts.txt)",
    )
    args = parser.parse_args()

    client = OpenAI()

    # Read prompts from file
    if not args.prompts.exists():
        print(f"Error: {args.prompts} not found")
        return

    prompts = []
    with open(args.prompts, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                # Parse "Title: Description" format
                if ":" in line:
                    title, description = line.split(":", 1)
                    prompts.append((title.strip(), description.strip()))
                else:
                    prompts.append((f"video_{len(prompts) + 1}", line))

    print(f"Found {len(prompts)} prompts to process")

    # Output directory
    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    # Track jobs
    jobs = []

    # Create all video jobs
    print("\n=== Creating video jobs ===")
    for i, (title, prompt) in enumerate(prompts, 1):
        print(f"\n[{i}/{len(prompts)}] Creating: {title}")
        print(f"  Prompt: {prompt[:80]}...")

        try:
            video = client.videos.create(
                model="sora-2",
                prompt=prompt,
                size="1280x720",
                seconds="12",
            )
            print(f"  Job ID: {video.id}")
            jobs.append(
                {
                    "id": video.id,
                    "title": title,
                    "prompt": prompt,
                    "status": video.status,
                }
            )
        except Exception as e:
            print(f"  Error: {e}")
            jobs.append(
                {
                    "id": None,
                    "title": title,
                    "prompt": prompt,
                    "status": "failed",
                    "error": str(e),
                }
            )

        # Small delay between job creation
        time.sleep(1)

    # Poll and download completed videos
    print("\n=== Polling for completion ===")
    for job in jobs:
        if job["status"] == "failed" or not job["id"]:
            print(f"\nSkipping failed job: {job['title']}")
            continue

        print(f"\nWaiting for: {job['title']} (ID: {job['id']})")

        try:
            # Poll until complete
            max_attempts = 180
            poll_interval = 10

            for attempt in range(max_attempts):
                video = client.videos.retrieve(job["id"])
                progress = getattr(video, "progress", 0)
                print(
                    f"  Poll {attempt + 1}/{max_attempts}: status={video.status}, progress={progress}%"
                )

                if video.status == "completed":
                    break
                elif video.status == "failed":
                    error = getattr(video, "error", None)
                    raise Exception(f"Video generation failed: {error}")

                time.sleep(poll_interval)
            else:
                raise Exception("Video generation timed out")

            job["status"] = "completed"

            # Download video using the content endpoint
            filename = f"{sanitize_filename(job['title'])}.mp4"
            output_path = output_dir / filename

            print(f"  Downloading to {output_path}...")
            content = client.videos.download_content(job["id"], variant="video")
            content.write_to_file(str(output_path))
            print(f"  Downloaded: {output_path}")
            job["output_path"] = str(output_path)

        except Exception as e:
            print(f"  Error: {e}")
            job["status"] = "failed"
            job["error"] = str(e)

    # Summary
    print("\n=== Summary ===")
    completed = sum(1 for j in jobs if j["status"] == "completed")
    failed = sum(1 for j in jobs if j["status"] == "failed")
    print(f"Completed: {completed}/{len(jobs)}")
    print(f"Failed: {failed}/{len(jobs)}")

    if failed > 0:
        print("\nFailed jobs:")
        for job in jobs:
            if job["status"] == "failed":
                print(f"  - {job['title']}: {job.get('error', 'Unknown error')}")


if __name__ == "__main__":
    main()

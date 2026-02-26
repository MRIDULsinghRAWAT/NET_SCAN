"""
SSE (Server-Sent Events) streaming module for real-time scan updates.
"""
from queue import Queue
import threading

# Dictionary to manage event streams per target
_streams = {}
_streams_lock = threading.Lock()


def create_stream(target):
    """Create a new event stream for a target."""
    with _streams_lock:
        if target not in _streams:
            _streams[target] = Queue()
    return _streams[target]


def get_event_queue(target):
    """Get the event queue for a target, creating one if it doesn't exist."""
    with _streams_lock:
        if target not in _streams:
            _streams[target] = Queue()
        return _streams[target]


def push_event(target, event):
    """Push an event to a target's stream."""
    try:
        q = get_event_queue(target)
        q.put(event)
    except Exception as e:
        print(f"[ERROR] Failed to push event for {target}: {e}")


def close_stream(target):
    """Close/cleanup a stream for a target."""
    try:
        with _streams_lock:
            if target in _streams:
                q = _streams[target]
                # Put None to signal end of stream
                try:
                    q.put(None)
                except Exception:
                    pass
                # Clean up
                del _streams[target]
    except Exception as e:
        print(f"[ERROR] Failed to close stream for {target}: {e}")

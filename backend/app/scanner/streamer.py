from queue import Queue
from threading import Lock

# Simple in-memory event queues per target to support Server-Sent Events (SSE)
_streams = {}
_lock = Lock()

def create_stream(target):
    with _lock:
        if target in _streams:
            return _streams[target]
        q = Queue()
        _streams[target] = q
        return q

def get_event_queue(target):
    with _lock:
        if target not in _streams:
            return create_stream(target)
        return _streams[target]

def push_event(target, data):
    q = None
    with _lock:
        q = _streams.get(target)
    if q:
        q.put(data)

def close_stream(target):
    with _lock:
        q = _streams.pop(target, None)
    if q:
        # put sentinel None to indicate end of stream
        q.put(None)

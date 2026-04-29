import logging
import json
import time
from functools import wraps
from typing import Callable

class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            
    def info_json(self, event: str, **kwargs):
        payload = {"event": event, **kwargs}
        self.logger.info(json.dumps(payload))
        
    def error(self, msg: str, exc_info=False):
        self.logger.error(msg, exc_info=exc_info)

logger = StructuredLogger("anomaly-backend")

def log_latency(func: Callable):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        duration = (time.perf_counter() - start) * 1000
        logger.info_json(f"Latency_{func.__name__}", duration_ms=round(duration, 2))
        return result
    return wrapper

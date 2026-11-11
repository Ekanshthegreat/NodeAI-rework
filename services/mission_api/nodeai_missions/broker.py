"""RabbitMQ wakeups for the PostgreSQL mission queue."""
import logging
import time

import pika

QUEUE = 'nodeai.mission.wakeup.v1'
FALLBACK_SECONDS = 5
logger = logging.getLogger(__name__)


def connect(url):
    parameters = pika.URLParameters(url)
    parameters.connection_attempts = 1
    parameters.socket_timeout = 1
    parameters.stack_timeout = 2
    parameters.blocked_connection_timeout = 2
    return pika.BlockingConnection(parameters)


def wakeup_channel(connection):
    channel = connection.channel()
    channel.queue_declare(QUEUE, durable=True, arguments={
        'x-max-length': 1,
        'x-message-ttl': 30_000,
    })
    return channel


def notify_worker(url):
    try:
        with connect(url) as connection:
            channel = wakeup_channel(connection)
            channel.confirm_delivery()
            channel.basic_publish(
                exchange='', routing_key=QUEUE, body=b'wakeup', mandatory=True,
                properties=pika.BasicProperties(delivery_mode=2),
            )
    except (pika.exceptions.AMQPError, OSError, ValueError):
        logger.warning('Mission wakeup unavailable. Worker will check PostgreSQL.')


def wait_for_work(url):
    if not url:
        time.sleep(1)
        return
    try:
        with connect(url) as connection:
            channel = wakeup_channel(connection)
            for delivery, _, _ in channel.consume(QUEUE, inactivity_timeout=FALLBACK_SECONDS):
                if delivery is not None:
                    channel.basic_ack(delivery.delivery_tag)
                return
    except (pika.exceptions.AMQPError, OSError, ValueError):
        time.sleep(FALLBACK_SECONDS)

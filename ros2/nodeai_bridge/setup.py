from glob import glob
from setuptools import setup

setup(
    name="nodeai_bridge",
    version="0.2.0",
    packages=["nodeai_bridge"],
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/nodeai_bridge"]),
        ("share/nodeai_bridge", ["package.xml"]),
        ("share/nodeai_bridge/launch", glob("launch/*.py")),
        ("share/nodeai_bridge/config", glob("config/*.json")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Ekansh Chawla",
    maintainer_email="88723515+Ekanshthegreat@users.noreply.github.com",
    description="ROS 2 topic and Nav2 action bridge",
    license="MIT",
    entry_points={"console_scripts": ["bridge = nodeai_bridge.node:main"]},
)

FROM python:3.8-slim-buster
VOLUME ["/data"]
RUN apt-get update && apt-get install libgomp1
WORKDIR /app
COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

RUN apt-get autoremove -y \
    && apt-get autoclean -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["./run.sh"]
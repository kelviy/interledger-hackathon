# Interledger Hackathon
Showcasing Pay-As-You-Go integration tool for expensive premium software. Making software more accessible and affordable for consumers. 

The free tier is not always sufficient. To use premium features often requires monthly or yearly subscriptions. Pay-As-You-Go allows users to pay less for software that are used infrequently. Think about Adobe Photoshop, AI voice transcription... For companies, this means to expand the customer base. 




# Running
This project consists of 3 servers. One Django and one express server for the backend. One next.js server for the frontend.

**Remember to activate python environment variable first**.
- Recommended tool is `uv` and to add all neccesary dependencies use `uv sync`
- Remember to all npm install at the directories of the express and next.js servers



**To run servers:**
```bash
source start_server.sh
```

**To stop all servers:**
```bash
source end_server.sh
```

# Testing

1) Request Session
```bash
curl -H 'Content-Type: application/json' -d '{"product_name":"test"}' -X POST http://localhost:8000/request_session/
```

2) Create Session
```bash
curl -H 'Content-Type: application/json' -d '{"interact_ref":"45fe1984-86b1-4fbb-8f27-e870f5f25da2", "session_id":"70"}' -X POST http://localhost:8000/create_session/
```

- Change interact_ref and session_id.
- Interact_ref from url redirect
- session_id from (1) Request Session request

3) Make Payment
```bash
curl -H 'Content-Type: application/json'  -X GET http://localhost:8000/payment/?session_id=70
```

- Takes long (like 1 sec) because the whole incoming payment, quote... is regenerated


**By the !RandNotFound Team**
- Kelvin Wei
- Jing Yeh
- Kaamil Saib
- Calvin Wu
- Unnati Shankar


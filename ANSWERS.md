# Part C — Written Answers

## C1. Why can a call work locally but fail on different networks?

On the same network, browsers can often reach each other using local addresses. On different networks, routers and firewalls may block direct connections because both devices are behind NAT.

STUN helps discover public addresses, but it cannot solve every restriction. If a direct path cannot be created, the call needs a TURN relay.

## C2. What is the role of TURN?

A TURN server relays audio and video when the browsers cannot connect directly. STUN only helps discover possible addresses; TURN carries the actual media.

In production, I would use short-lived credentials, TLS, rate limits, and monitoring. TURN costs more than STUN because it uses server bandwidth for the media.

## C3. How would you handle an ICE restart?

An ICE restart refreshes the network path without rebuilding the whole call. It may be needed after a Wi-Fi-to-mobile switch, router change, or connection failure.

I would create a new offer with `iceRestart: true`, send it through the signaling server, and let the other peer answer. The media tracks can remain active while the network candidates are refreshed.

## C4. Architecture for 10,000 viewers

I would not send 10,000 separate streams from the seller's browser because the seller's upload bandwidth and CPU would be overloaded.

```text
                         ┌─────────────────┐
                         │ Load balancer   │
                         │ health + region │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼─────┐               ┌─────▼─────┐
              │ Origin SFU│ ─────────────►│ Edge SFU  │
              │ seller    │   one stream  │ viewers   │
              └─────┬─────┘               └─────┬─────┘
                    │                           │
                 Seller                    Many viewers
```

The seller sends one stream to an origin media server. The origin forwards it to several regional edge media servers. A load balancer assigns new viewers to healthy nearby servers. Each WebRTC session stays connected to its assigned server instead of moving between servers during the call.

P2P is good for a one-to-one call but does not scale to thousands of viewers. An SFU is suitable because it forwards one uploaded stream to many viewers. An MCU mixes streams and uses more processing, so it is more useful for group meetings than one-seller broadcasting.

I would use WebRTC/SFU for viewers who need very low latency and interaction. For the majority of passive viewers, I would convert the stream to LL-HLS and deliver it through a CDN. This is easier to scale, but it introduces more delay.

For mobile viewers, I would use adaptive bitrate and multiple quality levels. Viewers with slower networks would receive lower resolution and bitrate instead of making the whole stream fail.

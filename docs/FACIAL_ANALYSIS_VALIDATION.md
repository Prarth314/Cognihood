# Facial signal revision — October 29, 2026

## What this system measures

MediaPipe detects landmarks and blendshape coefficients; CogniHood does not identify a person. Eye aspect ratio (EAR), bilateral closure, blink events and head-pose changes are camera-derived proxies. Neither facial appearance nor expression establishes an exact probability of safe driving, stress, impairment or cognitive load. The displayed index remains an unvalidated engineering heuristic. The signal-quality number is not classification accuracy or a calibrated confidence interval.

The [NHTSA-sponsored driver-drowsiness study](https://rosap.ntl.bts.gov/view/dot/2578/dot_2578_DS1.pdf) defines PERCLOS in terms of time with at least 80% eye closure. This implementation's EAR/blendshape threshold does not measure pupil coverage directly, so the UI calls its result a sustained-closure **proxy**. Existing database fields retain their names for compatibility. No clinical equivalence is asserted. The 15/25% alert thresholds, 500 ms blink/run and gap thresholds, and EAR calibration multipliers are engineering settings requiring validation, not universal research-derived safety cutoffs.

## Changes

- Correct normalized-coordinate distance for the camera aspect ratio. Reject missing, nonfinite and degenerate eye geometry instead of interpreting it as a closed eye.
- Calibrate each eye independently using up to 50 low-blink observations, after at least ten candidates. Narrower observed eye geometry can calibrate below the previous fixed floor. Calibration is not a solution to every eye shape, squint or expression; starting with closed/squinting eyes can still corrupt the baseline.
- Require bilateral evidence for closure; a wink alone is not both eyes closed. Count a blink on reopening once.
- Weight closure by observed elapsed time rather than number of frames; exclude closure runs shorter than 500 ms. Never fill dropped-frame gaps longer than 500 ms with inferred closure. These conservative rules can underestimate closure during interruptions.
- Sort timestamps, deduplicate repeated timestamps and exclude invalid/future observations. Stale streams produce zero camera coverage. Coverage includes gaps, so bursts of old samples cannot impersonate a live stream.
- Measure the current contiguous closure duration from timestamps rather than showing a hardcoded 0.1 seconds.
- Remove head stillness as an independent eligibility/pre-drive failure condition and stop generating low-engagement trip incidents from it. Looking straight ahead can be ordinary behavior. Historical HHI fields remain experimental legacy descriptors, not validated hypnosis measures.
- Keep cloud AI as commentary. Its visual estimates no longer replace local numeric scores or determine eligibility. Local scores themselves remain provisional proxies.
- Treat poor/missing coverage as unavailable evidence; do not display it as a safe observation. Explain signal quality separately from accuracy.

## Tests actually run

The suite has 60 passing tests at this revision. New synthetic signal/geometry cases cover:

| Condition | Evidence |
| --- | --- |
| Coordinate aspect ratios 1:1, 4:3 and 16:9 | Geometry invariant test |
| Three scales and three in-plane rotations | 27 combinations checked; not 27 real faces |
| Translation and degenerate eye points | Geometry test |
| Left/right wink, bilateral EAR closure and bilateral blendshape closure | Synthetic decision tests |
| Uneven sampling and sustained closure | Known-duration time-weighting test |
| Brief closure versus sustained closure | Short-run exclusion and actual duration test |
| Dropped/stalled camera, stale samples | Gap and coverage tests |
| Reordered/duplicate/future/nonfinite input | Deterministic input handling test |
| Steady forward-facing observation | No head-stillness-only warning regression |
| Face coverage 0%, 20%, 69% | Unavailable-signal behavior tests |
| GPU failure and initialization retry | Mocked recovery tests |

No representative real-face/video dataset was evaluated in this task. No population accuracy, expression robustness or 99% accuracy was measured. Synthetic geometry checks validate calculations, not landmark detection performance.

## Required real-data evaluation

Use consented, licensed, independently annotated videos with subject-disjoint development and held-out test sets. Specify the label first: eye closure, blink event or sustained closure; “safe driver” cannot be obtained from a face-only label. Pre-register thresholds before evaluating the held-out set.

Evaluate variation in eye geometry, age ranges (adult participants), skin tones, facial hair, glasses/reflections, sunglasses, contact lenses, makeup, masks, smiles, talking, squints, yawns, winks, ptosis, head rotations, camera height/distance, multiple people, occlusion, low light/backlight, resolution, compression and frame rate. These conditions are **not yet validated**. Do not infer protected traits from camera images; use consented study metadata where subgroup evaluation is appropriate.

Report event precision/recall/F1, missed sustained closures, false alerts per hour, timing error, coverage/abstention rate, p50/p95 inference latency and subgroup results with confidence intervals. Report failures and abstentions, rather than dropping difficult faces. A claim of 99% overall accuracy could hide rare-event failures; a release target needs an explicit outcome and denominator.

Google documents that [detectForVideo blocks its calling thread](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js). Main-thread inference and actual Pi/mobile throughput still need device profiling and, where supported, a worker-based implementation. No worker or performance benchmark is claimed here.

Keep consent, source licenses, participant privacy, retention and deletion rules with the evaluation protocol. Do not upload participant face frames to Gemini or any external service without specific consent.

# PLAN.md - The Master Ledger

## Master Roadmap
- [ ] Phase 1: Foundation (Completed)
- [ ] Phase 2: Core Mechanics (Completed)
- [ ] Phase 3: UI/UX (Completed)
- [/] Phase 4: The Intelligence Layer (Current)
    - [ ] Audit & Clean up Routing Logic
    - [ ] Implement "The Simple Protocol" 
    - [ ] Verify "Auto-Rescue" Panic Trigger
    - [ ] A* Charger Search (150kW+)
    - [ ] Multi-Vehicle Compatibility
- [ ] Phase 5: Production Polish

## Current Trajectory
**Focus**: Implementing robust Auto-Rescue and Smart Routing logic.
**Goal**: Ensure the app safely routes EVs to chargers when battery is low using strictly defined logic.

## Squad Status
| Agent | Task | Status |
| :--- | :--- | :--- |
| **User** | Project Oversight | Active |
| **Logic** | Implement 'Simple Protocol' | Pending |
| **Research** | Audit existing codebase | Pending |
| **Nerd** | Test Cases & Verification | Pending |
| **Design** | Visuals (Out of Scope for this phase) | Idle |

## Architecture & Notes
### The Simple Protocol
1.  **Drive** until < 25% SoC.
2.  **Panic**: Trigger "Auto-Rescue".
3.  **Search**: Find 150kW+ charger. A* Cost = `Dist(Panic -> Charger) + Dist(Charger -> Dest)`.
4.  **Action**: Charge to 100%.
5.  **Resume**: Continue to destination.

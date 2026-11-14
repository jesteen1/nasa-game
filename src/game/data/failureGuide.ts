import { FAILURE_DEFS } from "../sim/failures";

export interface FailureGuideEntry {
  id: string;
  code: string;
  title: string;
  phase: string;
  telemetry: string;
  /** One-line symptom shown in compact tables. */
  short: string;
  /** Why the physics/rule engine produces this failure. */
  why: string;
  /** Concrete build or flight changes that prevent it. */
  fixes: string[];
}

const GUIDANCE: Record<string, Pick<FailureGuideEntry, "short" | "why" | "fixes">> = {
  nozzle_overexpanded: {
    short: "Vacuum bell lit at sea level",
    why:
      "A vacuum nozzle has a very large expansion ratio. At sea level the ambient pressure is high enough to separate the exhaust flow inside the bell, producing violent side loads that tear the engine apart about one second after ignition.",
    fixes: [
      "Fit a sea-level stage-1 engine: HTPB Solid Motor, Merlin 1D Sea-Level, RS-25, F-1 or Raptor 3 Sea-Level.",
      "Reserve vacuum engines (Merlin Vacuum, J-2 Vacuum, ICPS Vacuum, Raptor Vacuum) for the upper stage.",
      "Treat any nozzle-expansion warning in the analysis panel as a hard stop, not a caution.",
    ],
  },
  cryo_boiloff: {
    short: "Uninsulated LH₂ tank",
    why:
      "Liquid hydrogen boils at about 20 K. An uninsulated tank absorbs heat from the air, tank pressure collapses below the ignition threshold and the engine flames out during terminal count (T−5 s).",
    fixes: [
      "Swap the Uninsulated LH₂ Tank for an insulated cryogenic tank: SLS Core LH₂, Cryogenic Upper, S-II LH₂ or the CH₄ tanks.",
      "RP-1, solid and CH₄ stages do not trigger boil-off.",
      "Re-check the preflight warnings after every tank change.",
    ],
  },
  pad_burn: {
    short: "TWR below 1.0",
    why:
      "Liftoff thrust is lower than the vehicle's weight, so the stack cannot leave the pad. The engines burn through propellant on the launch mount until the vehicle is destroyed (T+8 s).",
    fixes: [
      "Add boosters or a higher-thrust stage-1 engine.",
      "Cut dry mass: lighter tank, avionics, interstage or payload.",
      "Aim for TWR 1.2–1.6 in the analysis panel before launch.",
    ],
  },
  pitch_divergence: {
    short: "No attitude control",
    why:
      "Without fins or a gimballed engine the centre of pressure sits ahead of the centre of mass as the rocket clears the tower. Aerodynamic torque flips the stack and Range Safety destroys it (T+12 s).",
    fixes: [
      "Install Aluminium Aero Fins (14 m²) when no gimballed engine is fitted.",
      "Gimballed engines (Merlin, RS-25, F-1, J-2, Raptor) provide control without fins.",
      "Keep the centre of mass above the centre of pressure — avoid a heavy payload on a short, wide stack.",
    ],
  },
  interstage_snap: {
    short: "Hammerhead + weak interstage",
    why:
      "A hammerhead fairing adds a large area ahead of the stack. At Max Q the bending moment exceeds the Lightweight Interstage's 28 kPa rating and the vehicle snaps in two.",
    fixes: [
      "Pair a hammerhead fairing with the Composite Interstage (60 kPa) or the Bolted Joint (80 kPa).",
      "Or keep the lightweight interstage and use a standard fairing.",
      "Throttle down near Max Q to reduce the bending load.",
    ],
  },
  max_q_exceeded: {
    short: "Dynamic-pressure redline",
    why:
      "After 20 s, if dynamic pressure exceeds the lower of the engine and tank Max-Q ratings while throttle is above 75 %, the airframe buckles and breaks up in the transonic region.",
    fixes: [
      "Throttle to about 70 % as Q approaches its peak, then return to full thrust after Max Q.",
      "Choose tanks or engines with a higher Max-Q rating (listed in the analysis panel).",
      "Reduce liftoff TWR (fewer boosters) if Q builds too quickly.",
    ],
  },
  ullage_cavitation: {
    short: "No ullage thrusters",
    why:
      "After separation the upper-stage propellant floats in microgravity. Without ullage thrusters the turbopump ingests gas bubbles on restart and the engine detonates.",
    fixes: [
      "Install the Ullage Thruster Kit before flying any two-stage vehicle.",
      "Single-stage vehicles never need ullage.",
      "Separate promptly at MECO so the coast before ignition stays short.",
    ],
  },
  early_fairing: {
    short: "Fairing jettisoned below 80 km",
    why:
      "Below 80 km the air is still dense enough to form a plasma shock in front of the exposed payload. Aero-thermal heating exceeds 1200 °C and the satellite melts.",
    fixes: [
      "Keep the fairing on until altitude is above 80 km — press F later.",
      "Wait for the “FAIRING JETTISON READY” warning after 80 km.",
      "Early jettison saves mass but destroys the payload.",
    ],
  },
  crash: {
    short: "Trajectory returned to the surface",
    why:
      "The stack ran out of vertical energy — too little Δv, an over-aggressive pitch program or an early engine cutoff — and re-entered before reaching the target.",
    fixes: [
      "Check Δv against the mission budget in the analysis panel.",
      "Add propellant or thrust, or reduce dry mass.",
      "Delay the pitch program or lower the maximum pitch so more thrust goes vertical.",
    ],
  },
  unstable_orbit: {
    short: "Payload deployed too slow",
    why:
      "The payload was released after SECO but below the insertion velocity. It re-enters and burns up before completing one orbit.",
    fixes: [
      "Wait for SECO and for velocity to pass the mission target before pressing D.",
      "Keep full throttle for the final upper-stage burn.",
      "Use a higher-Isp upper stage or a lighter payload if velocity falls short.",
    ],
  },
  timeout: {
    short: "1200 s without target",
    why:
      "The flight timer expired before the mission target. Usually the upper stage is too weak or heavy, staging was late, or a low-thrust engine was chosen.",
    fixes: [
      "Stage at MECO promptly (SPACE) and ignite the upper stage.",
      "Keep the stock upper stage: the 110 kN ICPS cannot finish Tier 3 in time.",
      "Reduce payload/tank mass or add Δv to the stack.",
    ],
  },
  abort: {
    short: "Manual / range-safety abort",
    why:
      "The abort command (X) or a range-safety action deliberately ended the flight.",
    fixes: [
      "Confirm the build passes preflight warnings before launch.",
      "Use X only when you intend to end the run.",
      "After an abort, review the event log and adjust the build.",
    ],
  },
};

/** Every failure rule with its cause and concrete prevention advice. */
export const FAILURE_GUIDE: FailureGuideEntry[] = Object.entries(FAILURE_DEFS).map(
  ([id, def]) => {
    const guidance = GUIDANCE[id] ?? {
      short: def.title,
      why: def.outcome,
      fixes: ["Review the build and flight profile, then try again."],
    };
    return {
      id,
      code: def.code,
      title: def.title,
      phase: def.phase,
      telemetry: def.telemetry,
      ...guidance,
    };
  },
);

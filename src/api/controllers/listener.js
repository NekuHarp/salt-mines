import { listener } from "../../shared/index.js";
import { matchedData } from "express-validator";

export function getListenerStatus(req, res) {
    return res.status(200).json(listener.getStatus());
}

export function startListener(req, res) {
    const { active } = listener.getStatus();
    if (active) {
        return res.fail({
            httpCode: 409,
            message: "Listener is already running.",
            errorCode: 50,
        });
    }

    const { matchesToRecord, strictMode, recordRemaining } = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });

    listener.start({ matchesToRecord, strictMode, recordRemaining });

    return res.status(200).json(listener.getStatus());
}

export function stopListener(req, res) {
    const { active } = listener.getStatus();
    if (!active) {
        return res.fail({
            httpCode: 409,
            message: "Listener is not running.",
            errorCode: 51,
        });
    }

    listener.stop();

    return res.status(200).json(listener.getStatus());
}

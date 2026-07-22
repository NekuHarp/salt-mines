import { createHash, timingSafeEqual } from "node:crypto";

// Compares two strings in constant time by hashing them to a fixed length
// first, so mismatched lengths don't leak through timingSafeEqual.
function safeEqual(a, b) {
    const hashA = createHash("sha256").update(a).digest();
    const hashB = createHash("sha256").update(b).digest();
    return timingSafeEqual(hashA, hashB);
}

function unauthorized(res) {
    res.set("WWW-Authenticate", 'Basic realm="salt-mines"');
    return res.fail({
        httpCode: 401,
        message: "Authentication required.",
        errorCode: 70,
    });
}

/**
 * HTTP Basic Auth middleware. Validates the `Authorization` header against the
 * SALT_MINES_USER_NAME / SALT_MINES_USER_PASSWORD credentials from the environment.
 */
export function basicAuth(req, res, next) {
    const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Basic" || !encoded) {
        return unauthorized(res);
    }

    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
        return unauthorized(res);
    }

    const name = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    const validName = safeEqual(name, process.env.SALT_MINES_USER_NAME ?? "");
    const validPassword = safeEqual(
        password,
        process.env.SALT_MINES_USER_PASSWORD ?? ""
    );

    if (!validName || !validPassword) {
        return unauthorized(res);
    }

    return next();
}

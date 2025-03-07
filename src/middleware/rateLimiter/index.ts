import rateLimit from "express-rate-limit";

// Rate limiting middleware
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (req) => {
    // Use the first IP in the X-Forwarded-For header
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

export default rateLimiter;

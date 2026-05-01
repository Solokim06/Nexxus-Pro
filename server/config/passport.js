const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');
const logger = require('../utils/logger');

class PassportConfig {
  constructor() {
    this.initialize = this.initialize.bind(this);
  }

  initialize() {
    // JWT Strategy
    const jwtOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    };

    passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
      try {
        const user = await User.findById(payload.userId).select('-password');
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }));

    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ email: profile.emails[0].value });
          
          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              avatar: profile.photos[0]?.value,
              isEmailVerified: true,
              provider: 'google',
              providerId: profile.id,
            });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }));
    }

    // GitHub OAuth Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL}/api/auth/github/callback`,
        scope: ['user:email'],
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
          let user = await User.findOne({ email });
          
          if (!user) {
            user = await User.create({
              name: profile.displayName || profile.username,
              email,
              avatar: profile.photos[0]?.value,
              isEmailVerified: true,
              provider: 'github',
              providerId: profile.id,
            });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }));
    }

    // Facebook OAuth Strategy
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
      passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.API_URL}/api/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'photos', 'email'],
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Email not provided by Facebook'), null);
          }
          
          let user = await User.findOne({ email });
          
          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email,
              avatar: profile.photos[0]?.value,
              isEmailVerified: true,
              provider: 'facebook',
              providerId: profile.id,
            });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }));
    }

    // Serialize user for session
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id).select('-password');
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });

    logger.info('Passport strategies configured');
    return passport;
  }

  getAuthenticatedUser(req) {
    return req.user || null;
  }

  isAuthenticated(req) {
    return !!req.user;
  }
}

module.exports = new PassportConfig();
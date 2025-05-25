import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import schedule from "node-schedule";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }
};

// Auth endpoints
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    res.json({
      token: data.session.access_token,
      user: data.user,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) throw error;

    res.status(201).json({
      message:
        "Registration successful. Please check your email for verification.",
      user: data.user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

// User profile endpoint
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.user_metadata?.full_name || "",
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Video endpoints
app.get("/api/videos", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) throw error;

    // Get the latest view count for each video
    const videosWithStats = await Promise.all(
      data.map(async (video) => {
        const { data: viewsData, error: viewsError } = await supabase
          .from("video_views")
          .select("*")
          .eq("video_id", video.id)
          .order("timestamp", { ascending: false })
          .limit(2);

        if (viewsError) throw viewsError;

        const latestView = viewsData[0];
        const previousView = viewsData[1];

        let viewsPerMinute = 0;
        if (latestView && previousView) {
          viewsPerMinute = latestView.views - previousView.views;
        }

        // Determine alert level
        let alertLevel = "normal";
        if (viewsPerMinute >= video.emergency_threshold) {
          alertLevel = "emergency";
        } else if (viewsPerMinute >= video.warning_threshold) {
          alertLevel = "warning";
        }

        return {
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnail,
          status: video.status,
          alertLevel,
          currentViews: latestView ? latestView.views : 0,
          viewsPerMinute,
          warningThreshold: video.warning_threshold,
          emergencyThreshold: video.emergency_threshold,
        };
      })
    );

    res.json(videosWithStats);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

app.get("/api/videos/preview", authenticateToken, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    const response = await youtube.videos.list({
      part: "snippet",
      id,
    });

    const video = response.data.items[0];

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({
      id: video.id,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
    });
  } catch (error) {
    console.error("Error fetching video preview:", error);
    res.status(500).json({ error: "Failed to fetch video preview" });
  }
});

app.post("/api/videos", authenticateToken, async (req, res) => {
  try {
    const {
      videoId,
      title,
      thumbnail,
      warningThreshold,
      emergencyThreshold,
      notifications,
    } = req.body;

    const { data, error } = await supabase
      .from("videos")
      .insert({
        id: videoId,
        title,
        thumbnail,
        warning_threshold: warningThreshold,
        emergency_threshold: emergencyThreshold,
        status: "active",
        notifications,
        user_id: req.user.id, // Add user_id to associate video with user
      })
      .select();

    if (error) throw error;

    const response = await youtube.videos.list({
      part: "statistics",
      id: videoId,
    });

    const viewCount = Number.parseInt(
      response.data.items[0].statistics.viewCount,
      10
    );

    await supabase.from("video_views").insert({
      video_id: videoId,
      views: viewCount,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error adding video:", error);
    res.status(500).json({ error: "Failed to add video" });
  }
});

app.get("/api/videos/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", id)
      .eq("user_id", req.user.id) // Only fetch videos owned by the user
      .single();

    if (videoError) throw videoError;

    if (!videoData) {
      return res.status(404).json({ error: "Video not found" });
    }

    const { data: viewsData, error: viewsError } = await supabase
      .from("video_views")
      .select("*")
      .eq("video_id", id)
      .order("timestamp", { ascending: false })
      .limit(60);

    if (viewsError) throw viewsError;

    const viewHistory = [];
    for (let i = 0; i < viewsData.length - 1; i++) {
      const current = viewsData[i];
      const previous = viewsData[i + 1];

      viewHistory.push({
        timestamp: current.timestamp,
        views: current.views,
        viewsPerMinute: current.views - previous.views,
      });
    }

    if (viewsData.length > 0) {
      const oldest = viewsData[viewsData.length - 1];
      viewHistory.push({
        timestamp: oldest.timestamp,
        views: oldest.views,
        viewsPerMinute: 0,
      });
    }

    let currentViews = 0;
    let viewsPerMinute = 0;
    let alertLevel = "normal";

    if (viewsData.length >= 2) {
      currentViews = viewsData[0].views;
      viewsPerMinute = viewsData[0].views - viewsData[1].views;

      if (viewsPerMinute >= videoData.emergency_threshold) {
        alertLevel = "emergency";
      } else if (viewsPerMinute >= videoData.warning_threshold) {
        alertLevel = "warning";
      }
    }

    res.json({
      id: videoData.id,
      title: videoData.title,
      thumbnail: videoData.thumbnail,
      status: videoData.status,
      alertLevel,
      currentViews,
      viewsPerMinute,
      warningThreshold: videoData.warning_threshold,
      emergencyThreshold: videoData.emergency_threshold,
      viewHistory: viewHistory.reverse(),
      notifications: videoData.notifications,
    });
  } catch (error) {
    console.error("Error fetching video details:", error);
    res.status(500).json({ error: "Failed to fetch video details" });
  }
});

app.patch("/api/videos/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "paused"].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Invalid status. Must be "active" or "paused"' });
    }

    // Check if the video belongs to the user
    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (videoError || !videoData) {
      return res
        .status(404)
        .json({ error: "Video not found or you do not have permission" });
    }

    const { data, error } = await supabase
      .from("videos")
      .update({ status })
      .eq("id", id)
      .eq("user_id", req.user.id) // Only update videos owned by the user
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (error) {
    console.error("Error updating video status:", error);
    res.status(500).json({ error: "Failed to update video status" });
  }
});

app.delete("/api/videos/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the video belongs to the user
    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (videoError || !videoData) {
      return res
        .status(404)
        .json({ error: "Video not found or you do not have permission" });
    }

    await supabase.from("video_views").delete().eq("video_id", id);

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id); // Only delete videos owned by the user

    if (error) throw error;

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
});

app.get("/api/notifications/history", authenticateToken, async (req, res) => {
  try {
    // Join with videos table to get only notifications for videos owned by the user
    const { data, error } = await supabase
      .from("notifications_log")
      .select(
        `
        *,
        videos!inner(user_id)
      `
      )
      .eq("videos.user_id", req.user.id)
      .order("timestamp", { ascending: false });

    if (error) throw error;

    // Remove the videos object from the response
    const cleanedData = data.map((item) => {
      const { videos, ...rest } = item;
      return rest;
    });

    res.json(cleanedData);
  } catch (error) {
    console.error("Error fetching notification history:", error);
    res.status(500).json({ error: "Failed to fetch notification history" });
  }
});

app.post("/api/notifications/test", authenticateToken, async (req, res) => {
  try {
    const { type, recipients, videoInfo } = req.body;

    if (!type || !recipients || recipients.length === 0 || !videoInfo) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Check if the video belongs to the user
    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("id")
      .eq("id", videoInfo.id)
      .eq("user_id", req.user.id)
      .single();

    // if (videoError || !videoData) {
    //   return res
    //     .status(404)
    //     .json({ error: "Video not found or you do not have permission" });
    // }

    for (const recipient of recipients) {
      switch (type) {
        case "email":
          await sendEmailNotification({
            to: recipient,
            videoInfo,
            alertLevel: "warning",
            isTest: true,
            userId: req.user.id,
          });
          break;
        case "zalo":
          await sendZaloNotification({
            to: recipient,
            videoInfo,
            alertLevel: "warning",
            isTest: true,
            userId: req.user.id,
          });
          break;
        case "sms":
          await sendSmsNotification({
            to: recipient,
            videoInfo,
            alertLevel: "warning",
            isTest: true,
            userId: req.user.id,
          });
          break;
        default:
          throw new Error(`Invalid notification type: ${type}`);
      }

      await supabase.from("notifications_log").insert({
        video_id: videoInfo.id,
        video_title: videoInfo.title,
        type,
        recipient,
        alert_level: "warning",
        message: `Test ${type} notification for ${videoInfo.title}`,
        status: "delivered",
        timestamp: new Date().toISOString(),
        views_per_minute: videoInfo.viewsPerMinute || 0,
        threshold: 100,
        user_id: req.user.id, // Add user_id to associate notification with user
      });
    }

    res.status(200).json({ message: "Test notification sent successfully" });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

async function sendEmailNotification({
  to,
  videoInfo,
  alertLevel,
  isTest = false,
  userId,
}) {
  try {
    console.log(
      `[${
        isTest ? "TEST " : ""
      }EMAIL] Sending ${alertLevel} alert to ${to} for video: ${
        videoInfo.title
      } (User: ${userId})`
    );

    // Example using nodemailer (uncomment and configure in production)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"YouTube View Tracker" <${process.env.SMTP_USER}>`,
      to,
      subject: `${
        isTest ? "[TEST] " : ""
      }${alertLevel.toUpperCase()} Alert: High view rate detected`,
      html: `
        <h1>${alertLevel.toUpperCase()} Alert: High view rate detected</h1>
        <p>The video <strong>${
          videoInfo.title
        }</strong> has reached a view rate of <strong>${
        videoInfo.viewsPerMinute
      } views/minute</strong>.</p>
        <p>View the video: <a href="https://www.youtube.com/watch?v=${
          videoInfo.id
        }">https://www.youtube.com/watch?v=${videoInfo.id}</a></p>
        <p>Please check the dashboard for more details.</p>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return false;
  }
}

async function sendZaloNotification({
  to,
  videoInfo,
  alertLevel,
  isTest = false,
  userId,
}) {
  try {
    // In a real implementation, use Zalo Official Account API
    console.log(
      `[${
        isTest ? "TEST " : ""
      }ZALO] Sending ${alertLevel} alert to ${to} for video: ${
        videoInfo.title
      } (User: ${userId})`
    );

    // Example Zalo API call (implement in production)
    /*
    const response = await fetch('https://openapi.zalo.me/v2.0/oa/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ZALO_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        recipient: { user_id: to },
        message: {
          text: `${isTest ? '[TEST] ' : ''}${alertLevel.toUpperCase()} Alert: The video "${videoInfo.title}" has reached ${videoInfo.viewsPerMinute} views/minute.`
        }
      }),
    });
    
    const result = await response.json();
    return result.success;
    */

    return true;
  } catch (error) {
    console.error("Error sending Zalo notification:", error);
    return false;
  }
}

async function sendSmsNotification({
  to,
  videoInfo,
  alertLevel,
  isTest = false,
  userId,
}) {
  try {
    // In a real implementation, use a service like Twilio or FPT SMS
    console.log(
      `[${
        isTest ? "TEST " : ""
      }SMS] Sending ${alertLevel} alert to ${to} for video: ${
        videoInfo.title
      } (User: ${userId})`
    );

    // Example Twilio API call (implement in production)
    /*
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const message = await twilio.messages.create({
      body: `${isTest ? '[TEST] ' : ''}${alertLevel.toUpperCase()} Alert: The video "${videoInfo.title}" has reached ${videoInfo.viewsPerMinute} views/minute.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    
    return message.sid;
    */

    return true;
  } catch (error) {
    console.error("Error sending SMS notification:", error);
    return false;
  }
}

// Scheduler to track video views
schedule.scheduleJob("* * * * *", async () => {
  try {
    console.log("Running scheduled video view check...");

    // Get all active videos
    const { data: videos, error } = await supabase
      .from("videos")
      .select("*")
      .eq("status", "active");

    if (error) throw error;

    // Process each video
    for (const video of videos) {
      try {
        // Get the latest view count
        const response = await youtube.videos.list({
          part: "statistics",
          id: video.id,
        });

        const videoStats = response.data.items[0];

        if (!videoStats) {
          console.error(`Video not found: ${video.id}`);
          continue;
        }

        const currentViews = Number.parseInt(
          videoStats.statistics.viewCount,
          10
        );

        // Get the previous view count
        const { data: prevViewsData, error: prevViewsError } = await supabase
          .from("video_views")
          .select("*")
          .eq("video_id", video.id)
          .order("timestamp", { ascending: false })
          .limit(1);

        if (prevViewsError) throw prevViewsError;

        // Insert new view count
        await supabase.from("video_views").insert({
          video_id: video.id,
          views: currentViews,
          timestamp: new Date().toISOString(),
        });

        // Check if we need to send alerts
        if (prevViewsData && prevViewsData.length > 0) {
          const prevViews = prevViewsData[0].views;
          const viewsPerMinute = currentViews - prevViews;

          console.log(
            `Video ${video.id}: ${viewsPerMinute} views/minute (User: ${video.user_id})`
          );

          // Check against thresholds
          if (viewsPerMinute >= video.emergency_threshold) {
            await sendAlerts(video, "emergency", viewsPerMinute);
          } else if (viewsPerMinute >= video.warning_threshold) {
            await sendAlerts(video, "warning", viewsPerMinute);
          }
        }
      } catch (videoError) {
        console.error(`Error processing video ${video.id}:`, videoError);
      }
    }
  } catch (error) {
    console.error("Error in scheduled job:", error);
  }
});

async function sendAlerts(video, alertLevel, viewsPerMinute) {
  const notifications = video.notifications || {};
  const threshold =
    alertLevel === "emergency"
      ? video.emergency_threshold
      : video.warning_threshold;

  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

  const { data: recentAlerts, error } = await supabase
    .from("notifications_log")
    .select("*")
    .eq("video_id", video.id)
    .eq("alert_level", alertLevel)
    .gt("timestamp", fiveMinutesAgo.toISOString());

  if (error) {
    console.error("Error checking recent alerts:", error);
    return;
  }

  if (recentAlerts && recentAlerts.length > 0) {
    console.log(
      `Already sent ${alertLevel} alert for video ${video.id} in the last 5 minutes. Skipping.`
    );
    return;
  }

  console.log(
    `Sending ${alertLevel} alerts for video ${video.id} (${viewsPerMinute} views/minute) (User: ${video.user_id})`
  );

  if (notifications.emails && notifications.emails.length > 0) {
    for (const email of notifications.emails) {
      const success = await sendEmailNotification({
        to: email,
        videoInfo: {
          id: video.id,
          title: video.title,
          viewsPerMinute,
        },
        alertLevel,
        userId: video.user_id,
      });

      await supabase.from("notifications_log").insert({
        video_id: video.id,
        video_title: video.title,
        type: "email",
        recipient: email,
        alert_level: alertLevel,
        message: `${alertLevel.toUpperCase()} Alert: ${viewsPerMinute} views/minute for ${
          video.title
        }`,
        status: success ? "delivered" : "failed",
        timestamp: new Date().toISOString(),
        views_per_minute: viewsPerMinute,
        threshold,
        user_id: video.user_id, // Add user_id to associate notification with user
      });
    }
  }

  if (notifications.zaloIds && notifications.zaloIds.length > 0) {
    for (const zaloId of notifications.zaloIds) {
      const success = await sendZaloNotification({
        to: zaloId,
        videoInfo: {
          id: video.id,
          title: video.title,
          viewsPerMinute,
        },
        alertLevel,
        userId: video.user_id,
      });

      await supabase.from("notifications_log").insert({
        video_id: video.id,
        video_title: video.title,
        type: "zalo",
        recipient: zaloId,
        alert_level: alertLevel,
        message: `${alertLevel.toUpperCase()} Alert: ${viewsPerMinute} views/minute for ${
          video.title
        }`,
        status: success ? "delivered" : "failed",
        timestamp: new Date().toISOString(),
        views_per_minute: viewsPerMinute,
        threshold,
        user_id: video.user_id, // Add user_id to associate notification with user
      });
    }
  }

  if (notifications.phoneNumbers && notifications.phoneNumbers.length > 0) {
    for (const phoneNumber of notifications.phoneNumbers) {
      const success = await sendSmsNotification({
        to: phoneNumber,
        videoInfo: {
          id: video.id,
          title: video.title,
          viewsPerMinute,
        },
        alertLevel,
        userId: video.user_id,
      });

      await supabase.from("notifications_log").insert({
        video_id: video.id,
        video_title: video.title,
        type: "sms",
        recipient: phoneNumber,
        alert_level: alertLevel,
        message: `${alertLevel.toUpperCase()} Alert: ${viewsPerMinute} views/minute for ${
          video.title
        }`,
        status: success ? "delivered" : "failed",
        timestamp: new Date().toISOString(),
        views_per_minute: viewsPerMinute,
        threshold,
        user_id: video.user_id, // Add user_id to associate notification with user
      });
    }
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
});

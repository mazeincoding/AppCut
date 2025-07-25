# Netlify Configuration Documentation: `netlify.toml`

This document describes the `netlify.toml` file, which contains configuration settings for deploying the OpenCut web application to Netlify.

## Overview

`netlify.toml` is the primary configuration file for Netlify deployments. It allows developers to define build settings, deploy contexts, redirects, and other deployment-related configurations directly within their project repository.

## Configuration Details

```toml
# Next.js plugin
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Redirects for domain migration
[[redirects]]
  from = "https://appcut.app/*"
  to = "https://opencut.app/:splat"
  status = 301
  force = true
```

## Sections Explained

### `[[plugins]]`

This section configures Netlify Build Plugins. Plugins extend Netlify's build process with additional functionalities.

*   `package = "@netlify/plugin-nextjs"`: This line specifies that the `@netlify/plugin-nextjs` plugin should be used. This plugin is essential for deploying Next.js applications on Netlify, as it optimizes the build output and handles serverless functions for API routes and server-side rendering.

### `[[redirects]]`

This section defines redirect rules for the site. Redirects are used to forward requests from one URL to another.

*   `from = "https://appcut.app/*"`: This is the source pattern for the redirect. It matches any request coming from the `appcut.app` domain.
*   `to = "https://opencut.app/:splat"`: This is the destination URL. `:splat` is a placeholder that captures the path from the `from` URL and appends it to the `to` URL, ensuring that all sub-paths are redirected correctly.
*   `status = 301`: This specifies a 301 HTTP status code, indicating a permanent redirect. This is important for SEO, as it tells search engines that the content has permanently moved to the new URL.
*   `force = true`: This ensures that the redirect is applied even if a file or directory exists at the `from` path.

## Purpose

This `netlify.toml` file serves two main purposes for the OpenCut project:

1.  **Next.js Deployment:** It enables seamless deployment of the Next.js application to Netlify by leveraging the specialized Next.js plugin.
2.  **Domain Migration:** It handles the permanent redirection of traffic from an old domain (`appcut.app`) to the new `opencut.app` domain, preserving SEO value and ensuring users are directed to the correct site.

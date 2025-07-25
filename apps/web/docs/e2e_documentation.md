# E2E Tests Documentation: `apps/web/e2e/`

This document provides an overview of the End-to-End (E2E) test suite for the OpenCut web application, located in the `apps/web/e2e/` directory. These tests are crucial for verifying the application's functionality from a user's perspective, simulating real user interactions.

## Directories and Their Contents

### `ai-tests/`

Contains E2E tests specifically for Artificial Intelligence (AI) related features, such as AI video generation, image editing with AI models, or any other AI-driven functionalities within the application.

### `export-tests/`

Houses E2E tests for the video export functionality, covering various export settings, formats, and ensuring the successful generation and download of video files.

### `fixtures/`

Stores test data, media files, or predefined states (fixtures) that are used across multiple E2E tests to ensure consistent test environments and reproducible results.

### `helpers/`

Contains utility functions and helper modules that abstract common E2E testing patterns, making test scripts cleaner, more readable, and easier to maintain.

### `media-tests/`

Includes E2E tests related to media management, such as uploading, importing, organizing, and manipulating various types of media (images, videos, audio) within the application.

### `navigation-tests/`

Focuses on testing the application's navigation flows, ensuring that users can move seamlessly between different pages, sections, and views without issues.

### `performance-tests/`

Contains E2E tests designed to measure and monitor the application's performance under various scenarios, such as loading times, rendering speeds, and responsiveness during complex operations.

### `results/`

This directory is typically used to store the output of E2E test runs, such as test reports, screenshots of failed tests, or video recordings of test execution.

### `timeline-tests/`

Dedicated to E2E tests for the video editing timeline, covering functionalities like adding/removing elements, trimming, splitting, moving, and other timeline manipulations.

### `ui-tests/`

Includes general E2E tests for the application's user interface, ensuring that UI elements are correctly rendered, interactive, and respond as expected to user input.

### `video-export-tests/`

Similar to `export-tests/`, this directory specifically focuses on the end-to-end testing of the video export process, potentially with more granular scenarios or edge cases.

## Individual Files and Their Functionality

### `README.md`

Provides essential information about the E2E test suite, including setup instructions, how to run tests, test conventions, and possibly an overview of the testing framework used (e.g., Playwright, Cypress).

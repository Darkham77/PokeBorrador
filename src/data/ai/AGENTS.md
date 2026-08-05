# AGENTS.md - AI DATASETS MODULE

## Overview

This directory contains typed dataset wrappers and JSON databases for battle AI random sets and heuristic evaluation data.

## Governance & Standards

- Raw JSON files must be wrapped by typed Data Wrappers (`randomSetsData.ts`).
- Direct import of raw `.json` files in business logic is strictly prohibited.

/**
 * Generates task titles based on pipeline stage and lead name.
 * 
 * @param {string} stage - The current pipeline stage (New, Contacted, Demo, Proposal, Follow Up, Won)
 * @param {string} leadName - The full name of the lead
 * @param {object} options - Optional configuration
 * @param {number} options.demoCount - For Demo stage: 1 for first demo, 2 for second demo (default: 1)
 * @returns {string} - Generated task title
 * @throws {Error} - If stage is invalid or unknown
 */
export function generateTaskTitle(stage, leadName, options = {}) {
  // Validate stage is provided and is a string
  if (!stage || typeof stage !== "string") {
    const error = new Error(`Invalid stage: ${stage}. Stage must be a non-empty string.`);
    console.error("Task title generation error:", error);
    throw error;
  }
  
  // Normalize stage name (handle variations like "Follow-Up" vs "Follow Up")
  const normalizedStage = normalizeStage(stage);
  
  // Validate stage
  const validStages = ["New", "Responded", "Demo Scheduled", "Demo Completed", "SRS", "Converted"];
  if (!validStages.includes(normalizedStage)) {
    const error = new Error(`Invalid stage: ${stage}. Valid stages are: ${validStages.join(", ")}`);
    console.error("Task title generation error:", error);
    throw error;
  }
  
  // Block task creation for Won stage
  if (normalizedStage === "Converted") {
    const error = new Error("Cannot create tasks for leads in 'Converted' stage");
    console.error("Task title generation error:", error);
    throw error;
  }
  
  // Fallback to "Client" if leadName is missing
  const displayName = leadName?.trim() || "Client";
  
  // Generate title based on stage
  switch (normalizedStage) {
    case "New":
      return `First Call – ${displayName}`;
    
    case "Responded":
      return `Schedule Demo – ${displayName}`;
    
    case "Demo Scheduled":
    case "Demo Completed": {
      const demoCount = options.demoCount || 1;
      if (demoCount === 1) {
        return `Demo with ${displayName}`;
      } else {
        return `Second Demo – ${displayName}`;
      }
    }
    
    case "SRS":
      return `SRS Follow-up – ${displayName}`;
    
    default:
      // This should never be reached due to validation above, but included for safety
      throw new Error(`Unhandled stage: ${normalizedStage}`);
  }
}

/**
 * Normalizes stage names to handle variations.
 * 
 * @param {string} stage - The stage name to normalize
 * @returns {string} - Normalized stage name
 */
function normalizeStage(stage) {
  if (!stage || typeof stage !== "string") {
    // Return null if stage is invalid, so generateTaskTitle can throw proper error
    return null;
  }
  
  // Handle common variations
  const normalized = stage.trim();
  
  // Map variations to standard names
  const stageMap = {
    "Follow-Up": "Follow Up",
    "FollowUp": "Follow Up",
    "follow-up": "Follow Up",
    "follow up": "Follow Up",
  };
  
  return stageMap[normalized] || normalized;
}

/**
 * Validates if a stage allows task creation.
 * 
 * @param {string} stage - The pipeline stage
 * @returns {boolean} - True if tasks can be created for this stage
 */
export function canCreateTaskForStage(stage) {
  const normalizedStage = normalizeStage(stage);
  return normalizedStage !== "Converted";
}

/**
 * Gets the demo count for a lead based on existing demo tasks.
 * 
 * @param {Array} existingTasks - Array of existing tasks for the lead
 * @returns {number} - 1 for first demo, 2 for second demo, etc.
 */
export function getDemoCount(existingTasks = []) {
  if (!Array.isArray(existingTasks)) {
    return 1;
  }
  
  // Count actual demo tasks (exclude "Schedule Demo" tasks as they are scheduling, not actual demos)
  const demoTasks = existingTasks.filter(task => {
    const title = (task.title || "").toLowerCase();
    // Include tasks with "demo" but exclude "schedule demo" tasks
    return title.includes("demo") && !title.includes("schedule");
  });
  
  return demoTasks.length + 1;
}


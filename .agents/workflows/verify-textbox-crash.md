---
description: Verify Textbox Creation Crash Regression
---

Run this automated test to ensure that adding a new textbox to the canvas does NOT crash the application (specifically preventing React hook rule violations and out-of-bounds Fabric selection errors).

1. Execute the `browser_subagent` tool with the following configurations:
   - `TaskName`: "Verifying Textbox Crash Regression & Selection Styles"
   - `RecordingName`: "verify_textbox_selection_regression"
   - `Task`: "Navigate to http://localhost:5174/. Wait for the page to fully load. Find the 'Add Text' button in the left sidebar and click it. Move to the canvas and click at coordinates (400, 400). Wait 1 second to ensure the text element ('New Text') appears. Next, simulate a user selecting partial text: double-click the text to enter edit mode. Move the text cursor to the end of the text if it isn't already. Then, hold down the 'Shift' key and press the 'Left Arrow' key 4 times to select the word 'Text'. Then, go to the right Property Panel, find the 'Text Color' picker, and change the color to red (#FF0000). Finally, click somewhere empty on the canvas to deselect the text. Verify that the partial text color was applied correctly AND that the page did NOT go black or crash during any of these steps (especially when losing focus to click the color picker or deselecting). Report your visual findings and any console errors."
2. Report the findings from the subagent directly to the user.

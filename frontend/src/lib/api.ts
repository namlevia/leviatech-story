// Configure base URL correctly. Use absolute URL to bypass Next.js proxy and prevent SSE buffering.
const API_BASE = 'http://127.0.0.1:1997/api';

export async function parseOutline(outlineText: string) {
  const res = await fetch(`${API_BASE}/generator/parse-outline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outline_text: outlineText }),
  });
  if (!res.ok) throw new Error("Failed to parse outline");
  return res.json();
}

export async function suggestTitle(theme: string, projectType: string, customPrompt: string) {
  const res = await fetch(`${API_BASE}/generator/suggest-title`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme, project_type: projectType, custom_prompt: customPrompt }),
  });
  if (!res.ok) throw new Error("Failed to suggest title");
  return res.json();
}

export async function rewriteParagraph(originalText: string, instruction: string, useReflection: boolean) {
  const res = await fetch(`${API_BASE}/generator/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ original_text: originalText, instruction, use_reflection: useReflection }),
  });
  if (!res.ok) throw new Error("Failed to rewrite");
  return res.json();
}

export async function polishText(originalText: string, targetStyle: string, tone: string, useReflection: boolean) {
  const res = await fetch(`${API_BASE}/generator/polish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ original_text: originalText, target_style: targetStyle, tone, use_reflection: useReflection }),
  });
  if (!res.ok) throw new Error("Failed to polish");
  return res.json();
}

// Helper to handle SSE streams
export function streamCompletion(endpoint: string, payload: any, onChunk: (text: string) => void, onComplete: () => void, onError: (err: any) => void, abortSignal?: AbortSignal) {
  fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
    signal: abortSignal,
  })
    .then(async (response) => {
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();
            if (dataStr === "{}" || dataStr === "") continue; // Close event
            try {
              const data = JSON.parse(dataStr);
              if (data.clear || data.Clear) {
                onChunk("[CLEAR]");
              }
              if (data.content || data.Content) {
                onChunk(data.content || data.Content);
              }
            } catch (e) {
              console.error("Error parsing JSON:", e, dataStr);
            }
          }
        }
      }
    })
    .catch(onError);
}

// Project Management
export async function getProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Failed to get projects");
  return res.json();
}

export async function getProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error("Failed to get project details");
  return res.json();
}

export async function deleteProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete project");
  return res.json();
}

export async function exportProject(projectId: string, format: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format }),
  });

  if (!res.ok) {
    throw new Error("Failed to export project");
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Try to get filename from headers, fallback to a default
  let filename = `export_${projectId}.${format}`;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);

  return { success: true, file_path: filename };
}

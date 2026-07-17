package blnk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (c *Client) Post(ctx context.Context, path string, body any, out any) error {
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			return err
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Blnk-Key", c.apiKey)

	return c.do(req, out)
}

func (c *Client) Put(ctx context.Context, path string, body any, out any) error {
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			return err
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, c.baseURL+path, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Blnk-Key", c.apiKey)

	return c.do(req, out)
}

func (c *Client) Get(ctx context.Context, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-Blnk-Key", c.apiKey)

	return c.do(req, out)
}

// UploadReconciliationFile forwards a bank statement to Blnk POST /reconciliation/upload.
func (c *Client) UploadReconciliationFile(ctx context.Context, source, filename string, r io.Reader) (*UploadResponse, error) {
	var body bytes.Buffer
	w := multipart.NewWriter(&body)

	if err := w.WriteField("source", source); err != nil {
		return nil, err
	}
	part, err := w.CreateFormFile("file", filename)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(part, r); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/reconciliation/upload", &body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("X-Blnk-Key", c.apiKey)

	var out UploadResponse
	if err := c.do(req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) do(req *http.Request, out any) error {
	res, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		var problem map[string]any
		_ = json.NewDecoder(res.Body).Decode(&problem)
		return fmt.Errorf("blnk request failed: status=%d body=%v", res.StatusCode, problem)
	}

	if out == nil {
		return nil
	}
	return json.NewDecoder(res.Body).Decode(out)
}

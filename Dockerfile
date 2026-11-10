# syntax=docker/dockerfile:1
FROM nginx:alpine

# Copy static site files into nginx html directory
COPY . /usr/share/nginx/html

# Copy vercel config and apply caching headers
COPY vercel.json /usr/share/nginx/html/vercel.json

# Expose default port (8080, can be changed with --http-port)
EXPOSE 8080

# Nginx config for static site routing + cache headers
RUN printf '%s\n' \
  'server {' \
  '    listen 8080;' \
  '    root /usr/share/nginx/html;' \
  '    index index.html;' \
  '    location ~* \.(js|css|html|webmanifest)$ {' \
  '        add_header Cache-Control "public, max-age=0, must-revalidate" always;' \
  '        add_header X-Content-Type-Options nosniff always;' \
  '        add_header X-Frame-Options DENY always;' \
  '        add_header Referrer-Policy strict-origin-when-cross-origin always;' \
  '        try_files $uri =404;' \
  '    }' \
  '    location = /manifest.webmanifest {' \
  '        add_header Content-Type "application/manifest+json" always;' \
  '        add_header Cache-Control "public, max-age=0, must-revalidate" always;' \
  '    }' \
  '    location / {' \
  '        try_files $uri $uri/ $uri.html =404;' \
  '    }' \
  '}' > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

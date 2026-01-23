FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory and generate self-signed certificate
RUN mkdir -p /etc/nginx/ssl && \
    apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Digital Sponsor/CN=auth.commonsolution.org"

# Expose standard HTTP and HTTPS ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
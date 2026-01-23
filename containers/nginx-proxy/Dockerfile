FROM nginx:latest

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory and generate certificate
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Digital Sponsor/CN=*.digitalsponsor.commonsolution.org"

# Expose standard HTTP and HTTPS ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
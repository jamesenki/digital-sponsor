FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Generate self-signed certificate for development
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=*.digitalsponsor.commonsolution.org"

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
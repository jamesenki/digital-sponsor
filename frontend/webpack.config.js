const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimization: {
    // Tree shaking and dead code elimination
    usedExports: true,
    sideEffects: false,
    
    // Code splitting
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for third-party libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        
        // Common chunk for shared components
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          enforce: true,
        },
        
        // AA Literature chunk
        literature: {
          test: /[\\/]src[\\/](components|services)[\\/].*[Ll]iterature/,
          name: 'literature',
          chunks: 'all',
          priority: 8,
        },
        
        // Recovery Dashboard chunk
        dashboard: {
          test: /[\\/]src[\\/](components|services)[\\/].*[Dd]ashboard/,
          name: 'dashboard',
          chunks: 'all',
          priority: 8,
        },
        
        // Meeting Finder chunk
        meetings: {
          test: /[\\/]src[\\/](components|services)[\\/].*[Mm]eeting/,
          name: 'meetings',
          chunks: 'all',
          priority: 8,
        },
        
        // Crisis Support chunk (high priority for accessibility)
        crisis: {
          test: /[\\/]src[\\/](components|services)[\\/].*[Cc]risis/,
          name: 'crisis',
          chunks: 'all',
          priority: 15,
        },
      },
    },
    
    // Runtime chunk for webpack runtime
    runtimeChunk: {
      name: 'runtime',
    },
    
    // Minimize bundle size
    minimize: true,
  },
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                // Enable tree shaking
                module: 'es2020',
                moduleResolution: 'node',
                target: 'es2018',
                lib: ['es2018', 'dom'],
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              // Enable CSS tree shaking
              modules: {
                auto: true,
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|webp)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]',
        },
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
    ],
  },
  
  // Performance budgets
  performance: {
    maxAssetSize: 250000, // 250kb
    maxEntrypointSize: 400000, // 400kb
    hints: 'warning',
  },
  
  // Source maps for debugging
  devtool: 'source-map',
  
  // Enable caching for faster builds
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
};
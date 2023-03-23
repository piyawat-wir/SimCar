const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
	mode: 'development',
	entry: {
		main: "./src/main.ts",
		worker: "./src/worker.ts",
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		clean: true,
	},
	plugins: [
		new MiniCssExtractPlugin(),
		new HtmlWebpackPlugin({
			title: 'Line Tracking Car Sim',
		})
	],
	devtool: "source-map",
	resolve: {
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: /\.ts?$/,
				use: "ts-loader",
				exclude: "/node_modules/",
				generator: {
					filename: 'js/[name][ext]'
				}
			},
			{
				test: /\.js$/,
				use: "source-map-loader"
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, "css-loader"],
			},
		],
	},
	devServer: {
		static: {
			directory: path.join(__dirname, 'dist'),
		},
		port: 3000,
		hot: true,
		liveReload: true,
	},
};
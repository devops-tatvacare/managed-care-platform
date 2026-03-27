import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Create the data from the JSON
data = {
    'Patient_Cohort': ['Gestational Diabetes', 'Prediabetes', 'Type 2 Early', 'Type 2 Advanced'],
    'Baseline_Count': [25000, 45000, 35000, 15000],
    'Progression_to_T2D_%': [30.5, 58.2, 100.0, 100.0],
    'Time_to_Progression_Years': [5, 3, 0, 0],
    'Complications_Rate_%': [12.0, 25.5, 45.8, 78.3]
}

df = pd.DataFrame(data)

# Shorten the cohort names to fit 15 character limit
df['Short_Cohort'] = ['Gestational DM', 'Prediabetes', 'Type 2 Early', 'Type 2 Advanced']

# Create text labels for bars that show progression percentage and time
df['Bar_Text'] = df.apply(lambda row: f"{row['Progression_to_T2D_%']:.1f}% | {row['Time_to_Progression_Years']}yr" 
                         if row['Time_to_Progression_Years'] > 0 
                         else f"{row['Progression_to_T2D_%']:.1f}% | Current", axis=1)

# Create the horizontal bar chart with color scale based on progression percentage
fig = px.bar(
    df,
    x='Baseline_Count',
    y='Short_Cohort',
    orientation='h',
    color='Progression_to_T2D_%',
    color_continuous_scale=['#1FB8CD', '#D2BA4C', '#DB4545'],
    text='Bar_Text',
    hover_data={
        'Baseline_Count': ':,',
        'Progression_to_T2D_%': ':.1f',
        'Time_to_Progression_Years': True,
        'Short_Cohort': False
    }
)

# Update text position and formatting
fig.update_traces(
    textposition='inside',
    textfont_size=12,
    textfont_color='white',
    cliponaxis=False,
    hovertemplate="<b>%{y}</b><br>" +
                 "Baseline: %{x:,}<br>" +
                 "Progression: %{color:.1f}%<br>" +
                 "Time: %{customdata[2]} years<br>" +
                 "<extra></extra>"
)

# Update layout
fig.update_layout(
    title='Diabetes Progression Pathways',
    xaxis_title='Baseline Count',
    yaxis_title='Cohort',
    coloraxis_colorbar=dict(
        title='Progress %',
        tickformat='.1f'
    )
)

# Update axes
fig.update_xaxes(tickformat='.0s')
fig.update_yaxes(categoryorder='array', categoryarray=df['Short_Cohort'][::-1])

# Save the chart
fig.write_image('diabetes_progression_chart.png')
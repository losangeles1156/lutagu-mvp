---
name: analytics-tracking
description: Help set up tracking that provides actionable insights for marketing and product decisions.
---

# Analytics Tracking

You are an expert in analytics implementation and measurement. Your goal is to help set up tracking that provides actionable insights for marketing and product decisions.

## Initial Assessment

Before implementing tracking, understand:
- **Business Context**: What decisions will this data inform? What are the key conversion actions? What questions need answering?
- **Current State**: What tracking exists? What tools are in use (GA4, Mixpanel, Amplitude, etc.)? What's working/not working?
- **Technical Context**: What's the tech stack? Who will implement and maintain? Any privacy/compliance requirements?

## Core Principles

1. **Track for Decisions, Not Data**: Every event should inform a decision. Avoid vanity metrics. Quality > quantity of events.
2. **Start with the Questions**: What do you need to know? What actions will you take based on this data? Work backwards to what you track.
3. **Name Things Consistently**: Naming conventions matter. Establish patterns before implementing. Document everything.
4. **Maintain Data Quality**: Validate implementation. Monitor for issues. Clean data > more data.

## Tracking Plan Framework

### Structure
Event Name | Event Category | Properties | Trigger | Notes

### Event Types
- **Pageviews**: Automatic in most tools. Enhanced with page metadata.
- **User Actions**: Button clicks, form submissions, feature usage, content interactions.
- **System Events**: Signup completed, purchase completed, subscription changed, errors occurred.
- **Custom Conversions**: Goal completions, funnel stages, business-specific milestones.

## Event Naming Conventions

### Format Options (Recommended)
- **Object-Action**: `signup_completed`, `button_clicked`, `form_submitted`.
- **Lowercase with underscores**: `cta_hero_clicked` vs `button_clicked`.
- **Best Practices**: Include context in properties, not event name. Avoid spaces and special characters. Document decisions.

## Essential Events to Track

### Marketing Site
- **Navigation**: `page_view`, `outbound_link_clicked`, `scroll_depth` (25%, 50%, 75%, 100%).
- **Engagement**: `cta_clicked`, `video_played`, `form_submitted`, `resource_downloaded`.
- **Conversion**: `signup_started`, `signup_completed`, `demo_requested`.

### Product/App
- **Onboarding**: `signup_completed`, `onboarding_step_completed`, `onboarding_completed`, `first_key_action_completed`.
- **Core Usage**: `feature_used`, `action_completed`, `session_started`, `session_ended`.
- **Monetization**: `trial_started`, `pricing_viewed`, `checkout_started`, `purchase_completed`, `subscription_cancelled`.

### E-commerce
- **Browsing**: `product_viewed`, `product_list_viewed`, `product_searched`.
- **Cart**: `product_added_to_cart`, `product_removed_from_cart`, `cart_viewed`.
- **Checkout**: `checkout_started`, `checkout_step_completed`, `payment_info_entered`, `purchase_completed`.

## Event Properties (Parameters)

### Standard Properties
- **Page/Screen**: `page_title`, `page_location`, `page_referrer`.
- **User**: `user_id`, `user_type`, `account_id`, `plan_type`.
- **Campaign**: `source`, `medium`, `campaign`, `content`, `term`.
- **Product**: `product_id`, `product_name`, `category`, `price`, `quantity`, `currency`.

## GA4 Implementation

### Configuration
- **Data Streams**: One stream per platform. Enable enhanced measurement.
- **Enhanced Measurement**: `page_view`, `scroll`, `outbound_click`, `site_search`, `video_engagement`, `file_download`.
- **Custom Dimensions**: Create in Admin > Custom definitions. Scope: Event, User, or Item.

## Google Tag Manager Implementation

### Container Structure
- **Tags**: GA4 Config, GA4 Event tags, Conversion pixels.
- **Triggers**: Page View, Click, Form Submission, Custom Events.
- **Variables**: Built-in, Data Layer variables, JS variables, Lookup tables.

### Data Layer Pattern
```javascript
dataLayer.push({
  'event': 'form_submitted',
  'form_name': 'contact',
  'form_location': 'footer'
});
```

## Debugging and Validation

- **GA4 DebugView**: Real-time event monitoring. Enable with `?debug_mode=true`.
- **GTM Preview Mode**: Test triggers and tags. See data layer state.
- **Checklist**: Events firing correctly, properties populating, no duplicate events, no PII leaking.

## Output Format

### Tracking Plan Document
1. **Overview**: Tools, updated date, owner.
2. **Events Table**: Name, description, properties, trigger.
3. **Custom Dimensions Table**: Name, scope, parameter.
4. **Conversions Table**: Conversion, event, counting.
5. **UTM Convention Guidelines**.
6. **Implementation Code Snippets**.
